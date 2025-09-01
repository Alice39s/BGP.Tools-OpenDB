import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

const USER_AGENT =
  "BGP.Tools-OpenDB/1.0.0 (https://github.com/Alice39s/BGP.Tools-OpenDB)";

// Core HTTP request with retry mechanism
const httpRequest = async (url, options = {}) => {
  const { maxRetries = 3, retryDelay = 1000, ...fetchOptions } = options;

  const makeRequest = async () => {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, ...fetchOptions.headers },
      ...fetchOptions,
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} - ${url}`,
      );
    }

    return response;
  };

  let lastError,
    delay = retryDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await makeRequest();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError;
};

// Get text content
export const fetchText = async (url, options = {}) => {
  const response = await httpRequest(url, options);
  return response.text();
};

// Download file to filesystem
export const downloadFile = async (url, filepath, options = {}) => {
  const response = await httpRequest(url, options);
  await pipeline(response.body, createWriteStream(filepath));
};
