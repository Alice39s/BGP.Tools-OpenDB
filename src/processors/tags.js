import { parseTagsIndex, parseTagDetailData } from "../fetchers/tags.js";
import {
  ensureDirectoryExists,
  generateBaseMetadata,
  writeFileWithHash,
  writeMetadataWithHash,
  generateReleaseFiles,
  getCurrentDateString,
  logFileOperation,
} from "./utils.js";

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

    // Write CSV file
    const csvFilename = `tags-${tag.name}.csv`;
    const csvHash = await writeFileWithHash(
      `${tagDir}/${csvFilename}`,
      tag.data,
    );

    // Calculate hash values
    const hashList = {
      [csvFilename]: csvHash,
    };

    // Generate metadata
    const metadata = generateBaseMetadata({
      timestamp,
      additionalFields: {
        tag_name: tag.name,
        tag_count: tag.count,
        actual_entries: tagDetailData.length,
        hash_list: hashList,
        stats: {
          generated_at: new Date().toISOString(),
        },
      },
    });

    // Write metadata file with auto-calculated hash
    await writeMetadataWithHash(`${tagDir}/index-meta.json`, metadata);

    // If in production environment, generate release files
    await generateReleaseFiles({
      content: tag.data,
      baseName: `tags-${tag.name}`,
      dateStr,
      formats: ["gz", "xz"],
    });

    console.log(
      `✅ Tag ${tag.name} processing completed, ${tagDetailData.length} actual entries`,
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
