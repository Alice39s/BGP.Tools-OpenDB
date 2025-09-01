/**
 * ASN mapping data fetcher module
 */

import {
  fetchWithLogging,
  parseCSVLine,
  normalizeASN,
  cleanQuotedField,
  filterValidLines,
  logParsingStart,
  logParsingComplete,
} from "./utils.js";

const ASNS_URL = "https://bgp.tools/asns.csv";

/**
 * Fetch ASN mapping data
 * @returns {Promise<string>} ASN mapping data in CSV format
 */
export async function fetchASNs() {
  return await fetchWithLogging(ASNS_URL, "ASN mapping");
}

/**
 * Parse ASN mapping data
 * @param {string} csvData Raw CSV data
 * @returns {Array<Object>} Parsed ASN mapping data
 */
export function parseASNData(csvData) {
  const lines = filterValidLines(csvData);
  const results = [];

  // Skip header line
  const dataLines = lines.slice(1);

  logParsingStart(dataLines.length, "ASN mapping");

  for (const line of dataLines) {
    // Simple CSV parsing, handling quoted fields that may contain commas
    const parts = parseCSVLine(line);

    if (parts.length >= 3) {
      const asn = normalizeASN(parts[0]);
      const name = cleanQuotedField(parts[1]);
      const classification = parts[2];

      results.push({
        asn,
        name,
        class: classification,
      });
    }
  }

  logParsingComplete(results.length, "ASN mapping");

  return results;
}
