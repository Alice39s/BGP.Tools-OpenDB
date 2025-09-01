/**
 * Tag data fetcher module
 */

import {
  fetchWithLogging,
  normalizeASN,
  cleanQuotedField,
  filterValidLines,
  logParsingStart,
  logParsingComplete,
  parseValidInteger,
  sleep,
} from "./utils.js";

const TAGS_INDEX_URL = "https://bgp.tools/tags.txt";
const TAGS_DETAIL_URL_PREFIX = "https://bgp.tools/tags/";

/**
 * Fetch tag index data
 * @returns {Promise<Array<Object>>} Tag list with statistics
 */
export async function fetchTags() {
  const indexData = await fetchWithLogging(TAGS_INDEX_URL, "tag index");
  const tagsList = parseTagsIndex(indexData);

  console.log(`📡 Fetching detailed data for ${tagsList.length} tags...`);

  // Fetch detailed data for all tags sequentially (single-threaded)
  const tagsWithData = [];
  for (const tag of tagsList) {
    try {
      console.log(`📄 Fetching tag: ${tag.name}`);
      const data = await fetchWithLogging(
        `${TAGS_DETAIL_URL_PREFIX}${tag.name}.csv`,
        `tag ${tag.name}`,
        { maxRetries: 2, retryDelay: 1000 },
      );
      tagsWithData.push({ ...tag, data });
      await sleep(1500);
    } catch (error) {
      console.warn(
        `⚠️ Failed to fetch detailed data for tag ${tag.name}: ${error.message}`,
      );
      tagsWithData.push({ ...tag, data: null, error: error.message });
    }
  }

  // Filter successful results
  const successfulTags = tagsWithData.filter((tag) => tag.data !== null);

  console.log(
    `✅ Successfully fetched data for ${successfulTags.length}/${tagsList.length} tags`,
  );

  return successfulTags;
}

/**
 * Parse tag index data
 * @param {string} indexData Raw tag index data
 * @returns {Array<Object>} Tag list with statistics
 */
export function parseTagsIndex(indexData) {
  const lines = filterValidLines(indexData);
  const results = [];

  logParsingStart(lines.length, "tag index");

  for (const line of lines) {
    const parts = line.split(",");
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const count = parseValidInteger(parts[1].trim());

      if (count !== null) {
        results.push({
          name,
          count,
        });
      }
    }
  }

  logParsingComplete(results.length, "tag index");

  return results;
}

/**
 * Parse tag detail data
 * @param {string} csvData Raw CSV data
 * @returns {Array<Object>} Parsed tag data
 */
export function parseTagDetailData(csvData) {
  const lines = filterValidLines(csvData);
  const results = [];

  for (const line of lines) {
    // Parse format: AS number,name[,extra info]
    const parts = line.split(",");
    if (parts.length >= 2) {
      const asn = normalizeASN(parts[0]);
      const name = cleanQuotedField(parts[1]);
      const extra = parts.length > 2 ? parts[2] : "";

      results.push({
        asn,
        name,
        extra,
      });
    }
  }

  return results;
}
