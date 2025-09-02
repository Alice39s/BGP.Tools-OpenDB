import { parseTableData, separateByIPVersion } from "../fetchers/table.js";
import { generateMMDB } from "./mmdb.js";
import {
  ensureDirectoryExists,
  generateBaseMetadata,
  writeFileWithHash,
  writeMetadataWithHash,
  generateReleaseFiles,
  getCurrentDateString,
  logProcessingComplete,
  logFileOperation,
  compressMultipleFormats,
  calculateMultipleHashes,
} from "./utils.js";

/**
 * Process routing table data
 * @param {string} rawData Raw routing table data
 */
export async function processTableData(rawData) {
  const timestamp = Math.floor(Date.now() / 1000);
  const dateStr = getCurrentDateString();

  // Ensure directory exists
  await ensureDirectoryExists("table");

  console.log("🔄 Parsing routing table data...");
  const tableData = parseTableData(rawData);
  const { ipv4, ipv6 } = separateByIPVersion(tableData);

  // Generate JSONL format data
  const jsonlData = tableData.map((entry) => JSON.stringify(entry)).join("\n");
  const ipv4JsonlData = ipv4.map((entry) => JSON.stringify(entry)).join("\n");
  const ipv6JsonlData = ipv6.map((entry) => JSON.stringify(entry)).join("\n");

  // Write files
  logFileOperation("Writing", "JSONL files");
  const hashList = await Promise.all([
    writeFileWithHash("table/table-original.jsonl", jsonlData),
    writeFileWithHash("table/ipv4.jsonl", ipv4JsonlData),
    writeFileWithHash("table/ipv6.jsonl", ipv6JsonlData),
  ]).then(([originalHash, ipv4Hash, ipv6Hash]) => ({
    "table-original.jsonl": originalHash,
    "ipv4.jsonl": ipv4Hash,
    "ipv6.jsonl": ipv6Hash,
  }));

  // Compress files
  logFileOperation("Compressing", "files");
  const compressionResults = await compressMultipleFormats(
    "table/table-original.jsonl",
    ["gz"],
  );
  if (compressionResults.gz) {
    hashList["table-original.jsonl.gz"] = await calculateMultipleHashes([
      compressionResults.gz,
    ]).then((hashes) => Object.values(hashes)[0]);
  }

  // Generate MMDB database
  logFileOperation("Generating", "MMDB database");
  await generateMMDB(rawData, "table/table.mmdb");
  hashList["table.mmdb"] = await calculateMultipleHashes([
    "table/table.mmdb",
  ]).then((hashes) => Object.values(hashes)[0]);

  // Generate metadata
  const metadata = generateBaseMetadata({
    timestamp,
    additionalFields: {
      stats: {
        total_entries: tableData.length,
        ipv4_entries: ipv4.length,
        ipv6_entries: ipv6.length,
        generated_at: new Date().toISOString(),
      },
    },
  });

  // Add all file hashes to metadata hash_list
  Object.assign(metadata.hash_list, hashList);

  // Write metadata file with auto-calculated hash
  await writeMetadataWithHash("table/index-meta.json", metadata);

  // If in production environment, generate release files
  await generateReleaseFiles({
    content: jsonlData,
    baseName: "table",
    dateStr,
    formats: ["gz", "xz"],
  });

  logProcessingComplete("Routing table data", tableData.length);
}
