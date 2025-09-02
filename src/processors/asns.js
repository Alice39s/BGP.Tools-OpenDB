import { parseASNData } from "../fetchers/asns.js";
import { calculateSHA256 } from "../utils/hash.js";
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
} from "./utils.js";

/**
 * Process ASN mapping data
 * @param {string} csvData Raw CSV data
 */
export async function processASNData(csvData) {
  const timestamp = Math.floor(Date.now() / 1000);
  const dateStr = getCurrentDateString();

  // Ensure directory exists
  await ensureDirectoryExists("asns");

  console.log("🔄 Parsing ASN mapping data...");
  const asnData = parseASNData(csvData);

  // Write CSV file
  logFileOperation("Writing", "CSV file");
  const csvHash = await writeFileWithHash("asns/asns.csv", csvData);

  // Compress file
  logFileOperation("Compressing", "file");
  const { gz: gzPath } = await compressMultipleFormats("asns/asns.csv", ["gz"]);
  const gzHash = await calculateSHA256(gzPath);

  // Generate metadata
  const metadata = generateBaseMetadata({
    timestamp,
    additionalFields: {
      stats: {
        total_entries: asnData.length,
        generated_at: new Date().toISOString(),
      },
    },
  });

  // Add file hashes to metadata hash_list
  metadata.hash_list["asns.csv"] = csvHash;
  metadata.hash_list["asns.csv.gz"] = gzHash;

  // Write metadata file with auto-calculated hash
  await writeMetadataWithHash("asns/index-meta.json", metadata);

  // If in production environment, generate release files
  await generateReleaseFiles({
    content: csvData,
    baseName: "asns",
    dateStr,
    formats: ["gz", "xz"],
  });

  logProcessingComplete("ASN mapping data", asnData.length);
}
