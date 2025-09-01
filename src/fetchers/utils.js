/**
 * Common utilities for fetcher modules
 */

import { fetchText } from "../utils/http.js";

/**
 * Fetch data with standardized logging and error handling
 * @param {string} url The URL to fetch from
 * @param {string} dataType Description of data type for logging
 * @param {Object} options Fetch options
 * @returns {Promise<string>} Fetched data
 */
export async function fetchWithLogging(url, dataType, options = {}) {
  const defaultOptions = {
    maxRetries: 3,
    retryDelay: 2000,
    ...options,
  };

  console.log(`📡 Fetching ${dataType} data from ${url}...`);

  const data = await fetchText(url, defaultOptions);

  console.log(
    `✅ Successfully fetched ${dataType} data, size: ${(data.length / 1024 / 1024).toFixed(2)} MB`,
  );

  return data;
}

/**
 * Parse CSV line, handling quotes and commas properly
 * @param {string} line CSV line to parse
 * @returns {Array<string>} Array of parsed fields
 */
export function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Start or end quote
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add the last field
  fields.push(current.trim());

  return fields;
}

/**
 * Clean and normalize ASN value
 * @param {string} asn Raw ASN value
 * @returns {number} Normalized ASN number
 */
export function normalizeASN(asn) {
  return parseInt(asn.replace("AS", ""));
}

/**
 * Clean quoted field value
 * @param {string} field Field value that may have quotes
 * @returns {string} Cleaned field value
 */
export function cleanQuotedField(field) {
  return field.replace(/^"(.*)"$/, "$1");
}

/**
 * Filter out empty lines and trim whitespace
 * @param {string} data Raw text data
 * @returns {Array<string>} Array of non-empty, trimmed lines
 */
export function filterValidLines(data) {
  return data
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Log parsing progress
 * @param {number} totalLines Total number of lines to parse
 * @param {string} dataType Description of data type
 */
export function logParsingStart(totalLines, dataType) {
  console.log(`🔄 Parsing ${totalLines} ${dataType} entries...`);
}

/**
 * Log parsing completion
 * @param {number} validEntries Number of valid entries parsed
 * @param {string} dataType Description of data type
 */
export function logParsingComplete(validEntries, dataType) {
  console.log(
    `✅ Successfully parsed ${validEntries} valid ${dataType} entries`,
  );
}

/**
 * Validate and parse integer field
 * @param {string} value String value to parse
 * @returns {number|null} Parsed integer or null if invalid
 */
export function parseValidInteger(value) {
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Fetch multiple URLs in parallel with error handling
 * @param {Array<Object>} requests Array of {url, description} objects
 * @param {Object} options Fetch options
 * @returns {Promise<Array<Object>>} Array of {success, data, error} results
 */
export async function fetchMultipleWithErrorHandling(requests, options = {}) {
  const defaultOptions = {
    maxRetries: 2,
    retryDelay: 1000,
    ...options,
  };

  const results = await Promise.allSettled(
    requests.map(async (request) => {
      try {
        const data = await fetchText(request.url, defaultOptions);
        return {
          success: true,
          data,
          url: request.url,
          description: request.description,
        };
      } catch (error) {
        console.warn(
          `⚠️ Failed to fetch ${request.description}: ${error.message}`,
        );
        return {
          success: false,
          error: error.message,
          url: request.url,
          description: request.description,
        };
      }
    }),
  );

  return results.map((result) => result.value || result.reason);
}

export function sleep(ms) {
  console.log(`💤 Sleeping for ${ms}ms...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}