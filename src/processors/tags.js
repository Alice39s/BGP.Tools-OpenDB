import { parseTagDetailData } from "../fetchers/tags.js";
import {
  ensureDirectoryExists,
  generateBaseMetadata,
  writeFileWithHash,
  writeMetadataWithHash,
  generateReleaseFiles,
  getCurrentDateString,
  logFileOperation,
} from "./utils.js";

const NATURAL_STRING_COMPARE = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
}).compare;

/**
 * Process tag data
 * @param {Array<Object>} tagsList Tag list with their data
 */
export async function processTagsData(tagsList) {
  const timestamp = Math.floor(Date.now() / 1000);
  const dateStr = getCurrentDateString();

  // Ensure root directory exists
  await ensureDirectoryExists("tags");

  console.log(`🔄 Processing data for ${tagsList.length} tags...`);

  // Process each tag
  for (const tag of tagsList) {
    if (!tag.data) {
      console.log(`⏭️ Skipping tag ${tag.name} (no data)`);
      continue;
    }

    console.log(`🔄 Processing tag: ${tag.name} (${tag.count} entries)`);

    // Create tag-specific directory
    const tagDir = `tags/${tag.name}`;
    await ensureDirectoryExists(tagDir);

    // Parse tag detail data
    const tagDetailData = parseTagDetailData(tag.data);
    const sortedTagEntries = sortTagEntries(tagDetailData);
    const sortedCsvContent = formatTagEntries(sortedTagEntries);

    // Write CSV file
    const csvFilename = `tags-${tag.name}.csv`;
    const csvHash = await writeFileWithHash(
      `${tagDir}/${csvFilename}`,
      sortedCsvContent,
    );

    // Generate metadata
    const metadata = generateBaseMetadata({
      timestamp,
      additionalFields: {
        tag_name: tag.name,
        tag_count: tag.count,
        actual_entries: sortedTagEntries.length,
        stats: {
          generated_at: new Date().toISOString(),
        },
      },
    });

    // Add CSV file hash to metadata hash_list
    metadata.hash_list[csvFilename] = csvHash;

    // Write metadata file with auto-calculated hash
    await writeMetadataWithHash(`${tagDir}/index-meta.json`, metadata);

    // If in production environment, generate release files
    await generateReleaseFiles({
      content: sortedCsvContent,
      baseName: `tags-${tag.name}`,
      dateStr,
      formats: ["gz", "xz"],
    });

    console.log(
      `✅ Tag ${tag.name} processing completed, ${sortedTagEntries.length} actual entries`,
    );
  }

  // Generate tags index
  await generateTagsIndex(tagsList, timestamp);

  console.log(`✅ All tag data processing completed`);
}

/**
 * Generate tags master index file
 * @param {Array<Object>} tagsList Tag list
 * @param {number} timestamp Timestamp
 */
async function generateTagsIndex(tagsList, timestamp) {
  logFileOperation("Generating", "tags master index");

  // Generate tags.txt format index data
  const indexContent = tagsList
    .filter((tag) => tag.data) // Only include tags with data
    .map((tag) => `${tag.name},${tag.count}`)
    .join("\n");

  const tagsHash = await writeFileWithHash("tags/tags.txt", indexContent);

  // Generate index metadata
  const indexMetadata = generateBaseMetadata({
    timestamp,
    additionalFields: {
      total_tags: tagsList.filter((tag) => tag.data).length,
      hash_list: {
        "tags.txt": tagsHash,
      },
      stats: {
        generated_at: new Date().toISOString(),
      },
    },
  });

  // Write index metadata with auto-calculated hash
  await writeMetadataWithHash("tags/index-meta.json", indexMetadata);

  console.log(`✅ Tags master index generation completed`);
}

function sortTagEntries(entries) {
  return [...entries].sort((a, b) => {
    if (a.asn !== b.asn) {
      return a.asn - b.asn;
    }

    return NATURAL_STRING_COMPARE(a.name, b.name);
  });
}

function formatTagEntries(entries) {
  return entries.map(formatTagEntry).join("\n");
}

function formatTagEntry(entry) {
  const asnField = `AS${entry.asn}`;
  const nameField = quoteIfNeeded(entry.name);
  if (entry.extra && entry.extra.length > 0) {
    return `${asnField},${nameField},${entry.extra}`;
  }

  return `${asnField},${nameField}`;
}

function quoteIfNeeded(value) {
  if (value.includes(",") || value.includes("\"")) {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return value;
}
