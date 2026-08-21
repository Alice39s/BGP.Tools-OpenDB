import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

const USER_AGENT =
  "BGP.Tools-OpenDB/1.0.0 (https://github.com/Alice39s/BGP.Tools-OpenDB)";
const DEFAULT_TIMEOUT = 120_000;
const MAX_RETRY_DELAY = 30_000;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const getErrorMessage = (error) =>
  error instanceof Error ? error.message : String(error);

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const parseRetryAfter = (value) => {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : Math.max(0, timestamp - Date.now());
};

const createHTTPError = (response, url) => {
  const error = new Error(
    `HTTP ${response.status}: ${response.statusText || "Unknown status"} - ${url}`,
  );
  error.status = response.status;
  error.retryable = RETRYABLE_STATUS_CODES.has(response.status);
  error.retryAfter = parseRetryAfter(response.headers.get("retry-after"));
  return error;
};

const createTimeoutError = (url, timeout, cause) => {
  const error = new Error(`Request timed out after ${timeout}ms: ${url}`, {
    cause,
  });
  error.code = "ETIMEDOUT";
  error.retryable = true;
  return error;
};

const shouldRetry = (error, callerSignal) => {
  if (callerSignal?.aborted || error?.name === "AbortError") {
    return false;
  }

  return error?.retryable ?? true;
};

const getRetryDelay = (error, retryDelay, attempt) => {
  const retryAfter = error?.retryAfter;
  if (Number.isFinite(retryAfter)) {
    return Math.min(MAX_RETRY_DELAY, retryAfter);
  }

  return Math.min(MAX_RETRY_DELAY, retryDelay * 2 ** attempt);
};

const validateOptions = ({ maxRetries, retryDelay, timeout }) => {
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new TypeError("maxRetries must be a non-negative integer");
  }

  if (!Number.isFinite(retryDelay) || retryDelay < 0) {
    throw new TypeError("retryDelay must be a non-negative number");
  }

  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw new TypeError("timeout must be a positive integer in milliseconds");
  }
};

const requestWithRetry = async (url, options, consumeResponse) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = DEFAULT_TIMEOUT,
    ...fetchOptions
  } = options;

  validateOptions({ maxRetries, retryDelay, timeout });

  const callerSignal = fetchOptions.signal;
  const headers = new Headers(fetchOptions.headers);
  if (!headers.has("user-agent")) {
    headers.set("User-Agent", USER_AGENT);
  }

  let lastError;
  let attempts = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts += 1;
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, controller.signal])
      : controller.signal;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal,
      });

      if (!response.ok) {
        throw createHTTPError(response, url);
      }

      return await consumeResponse(response);
    } catch (error) {
      lastError = timedOut ? createTimeoutError(url, timeout, error) : error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt >= maxRetries || !shouldRetry(lastError, callerSignal)) {
      break;
    }

    const delay = getRetryDelay(lastError, retryDelay, attempt);
    console.warn(
      `[http] Request attempt ${attempt + 1}/${maxRetries + 1} failed for ${url}: ${getErrorMessage(lastError)}. Retrying in ${delay}ms`,
    );
    await sleep(delay);
  }

  throw new Error(
    `Request failed after ${attempts} attempt(s): ${url}: ${getErrorMessage(lastError)}`,
    { cause: lastError },
  );
};

// Get text content
export const fetchText = async (url, options = {}) => {
  return requestWithRetry(url, options, (response) => response.text());
};

// Download file to filesystem
export const downloadFile = async (url, filepath, options = {}) => {
  return requestWithRetry(url, options, async (response) => {
    if (!response.body) {
      throw new Error(`Response has no body: ${url}`);
    }

    await pipeline(response.body, createWriteStream(filepath));
  });
};
