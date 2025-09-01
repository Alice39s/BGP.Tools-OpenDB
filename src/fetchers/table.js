/**
 * Routing table data fetcher module
 */

import {
  fetchWithLogging,
  filterValidLines,
  logParsingStart,
  logParsingComplete,
} from "./utils.js";

const TABLE_URL = "https://bgp.tools/table.jsonl";

/**
 * Fetch routing table data
 * @returns {Promise<string>} Routing table data in JSONL format
 */
export async function fetchTable() {
  return await fetchWithLogging(TABLE_URL, "routing table");
}

/**
 * Parse routing table data into structured format
 * @param {string} rawData Raw routing table data in JSONL format
 * @returns {Array<Object>} Parsed routing table data
 */
export function parseTableData(rawData) {
  const lines = filterValidLines(rawData);
  const results = [];

  logParsingStart(lines.length, "routing table");

  for (const line of lines) {
    try {
      // Parse JSONL format: each line is a JSON object
      const entry = JSON.parse(line);
      
      if (entry.CIDR && entry.ASN) {
        results.push({
          CIDR: entry.CIDR,
          ASN: entry.ASN,
          Hits: entry.Hits || 1, // Default to 1 if Hits is not provided
        });
      }
    } catch (error) {
      // Skip invalid JSON lines
      console.warn(`⚠️ Failed to parse line: ${line.substring(0, 100)}...`);
    }
  }

  logParsingComplete(results.length, "routing table");

  return results;
}

/**
 * Separate routing table data into IPv4 and IPv6
 * @param {Array<Object>} tableData Routing table data
 * @returns {Object} Object containing ipv4 and ipv6 data
 */
export function separateByIPVersion(tableData) {
  const ipv4 = [];
  const ipv6 = [];

  for (const entry of tableData) {
    if (entry.CIDR.includes(":")) {
      ipv6.push(entry);
    } else {
      ipv4.push(entry);
    }
  }

  console.log(`📊 IPv4 entries: ${ipv4.length}, IPv6 entries: ${ipv6.length}`);

  return { ipv4, ipv6 };
}
