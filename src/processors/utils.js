/**
 * Common utilities for processor modules
 */

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { compressGzip, compressXz } from "../utils/compression.js";
import { calculateSHA256 } from "../utils/hash.js";

/**
 * Ensure directory exists, create if not
 * @param {string} dirPath Directory path to check/create
 */
export async function ensureDirectoryExists(dirPath) {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Generate standard metadata object
 * @param {Object} options Metadata options
 * @returns {Object} Metadata object
 */
export function generateBaseMetadata(options = {}) {
  const {
    timestamp = Math.floor(Date.now() / 1000),
    version = "1.0",
    additionalFields = {},
  } = options;

  return {
    timestamp,
    version,
    ...additionalFields,
    hash_list: {
      "index-meta.json": null, // Will be calculated after writing
    },
    stats: {
      generated_at: new Date().toISOString(),
    },
  };
}

/**
 * Write file and calculate its hash
 * @param {string} filePath Path to write the file
 * @param {string} content File content
 * @param {string} encoding File encoding (default: utf8)
 * @returns {Promise<string>} SHA256 hash of the file
 */
export async function writeFileWithHash(filePath, content, encoding = "utf8") {
  await writeFile(filePath, content, encoding);
  return await calculateSHA256(filePath);
}

/**
 * Write metadata file with auto-calculated hash
 * @param {string} metadataPath Path to metadata file
 * @param {Object} metadata Metadata object
 * @returns {Promise<Object>} Updated metadata object with calculated hash
 */
export async function writeMetadataWithHash(metadataPath, metadata) {
  // Write initial metadata
  const metadataJson = JSON.stringify(metadata, null, 2);
  await writeFile(metadataPath, metadataJson, "utf8");

  // Calculate and update metadata hash
  metadata.hash_list["index-meta.json"] = await calculateSHA256(metadataPath);

  // Write updated metadata
  const updatedMetadataJson = JSON.stringify(metadata, null, 2);
  await writeFile(metadataPath, updatedMetadataJson, "utf8");

  return metadata;
}

/**
 * Process multiple files with hash calculation
 * @param {Array<Object>} fileOperations Array of {path, content, encoding?} objects
 * @returns {Promise<Object>} Object with filename -> hash mapping
 */
export async function processFilesWithHashes(fileOperations) {
  const hashList = {};

  await Promise.all(
    fileOperations.map(async (operation) => {
      const { path, content, encoding = "utf8" } = operation;
      const fileName = path.split("/").pop(); // Get filename from path
      hashList[fileName] = await writeFileWithHash(path, content, encoding);
    }),
  );

  return hashList;
}

/**
 * Generate release files for production environment
 * @param {Object} options Release options
 * @returns {Promise<Array<string>>} Array of generated file names
 */
export async function generateReleaseFiles(options) {
  const { content, baseName, dateStr, formats = ["gz", "xz"] } = options;

  if (process.env.NODE_ENV !== "production") {
    return [];
  }

  console.log(`📦 Generating release files for ${baseName}...`);

  const releaseFile = `${baseName}-${dateStr}${getFileExtension(baseName)}`;
  await writeFile(releaseFile, content, "utf8");

  const compressionPromises = [];
  const generatedFiles = [releaseFile];

  if (formats.includes("gz")) {
    const gzFile = `${releaseFile}.gz`;
    compressionPromises.push(compressGzip(releaseFile, gzFile));
    generatedFiles.push(gzFile);
  }

  if (formats.includes("xz")) {
    const xzFile = `${releaseFile}.xz`;
    compressionPromises.push(compressXz(releaseFile, xzFile));
    generatedFiles.push(xzFile);
  }

  await Promise.all(compressionPromises);

  console.log(
    `✅ Generated release files: ${generatedFiles.slice(1).join(", ")}`,
  );

  return generatedFiles;
}

/**
 * Get current date string in YYYY-MM-DD format
 * @returns {string} Date string
 */
export function getCurrentDateString() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Log processing start
 * @param {string} dataType Description of data type
 * @param {number} count Number of items to process
 */
export function logProcessingStart(dataType, count) {
  console.log(`🔄 Processing ${count} ${dataType}...`);
}

/**
 * Log processing completion
 * @param {string} dataType Description of data type
 * @param {number} count Number of items processed
 */
export function logProcessingComplete(dataType, count) {
  console.log(`✅ ${dataType} processing completed, ${count} entries total`);
}

/**
 * Log file operation
 * @param {string} operation Operation description (e.g., "Writing", "Compressing")
 * @param {string} fileType File type description
 */
export function logFileOperation(operation, fileType) {
  const operationEmoji = getOperationEmoji(operation);
  console.log(`${operationEmoji} ${operation} ${fileType}...`);
}

/**
 * Compress file with multiple formats
 * @param {string} inputPath Input file path
 * @param {Array<string>} formats Array of compression formats ["gz", "xz"]
 * @returns {Promise<Object>} Object with format -> compressed file path mapping
 */
export async function compressMultipleFormats(inputPath, formats = ["gz"]) {
  const compressionResults = {};
  const compressionPromises = [];

  if (formats.includes("gz")) {
    const gzPath = `${inputPath}.gz`;
    compressionPromises.push(
      compressGzip(inputPath, gzPath).then(() => {
        compressionResults.gz = gzPath;
      }),
    );
  }

  if (formats.includes("xz")) {
    const xzPath = `${inputPath}.xz`;
    compressionPromises.push(
      compressXz(inputPath, xzPath).then(() => {
        compressionResults.xz = xzPath;
      }),
    );
  }

  await Promise.all(compressionPromises);
  return compressionResults;
}

/**
 * Calculate hashes for multiple files
 * @param {Array<string>} filePaths Array of file paths
 * @returns {Promise<Object>} Object with filename -> hash mapping
 */
export async function calculateMultipleHashes(filePaths) {
  const hashList = {};

  await Promise.all(
    filePaths.map(async (filePath) => {
      const fileName = filePath.split("/").pop();
      hashList[fileName] = await calculateSHA256(filePath);
    }),
  );

  return hashList;
}

/**
 * Get file extension from filename or baseName
 * @param {string} fileName File name or base name
 * @returns {string} File extension including the dot
 */
function getFileExtension(fileName) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot !== -1 ? fileName.substring(lastDot) : "";
}

/**
 * Get emoji for operation type
 * @param {string} operation Operation name
 * @returns {string} Corresponding emoji
 */
function getOperationEmoji(operation) {
  const emojiMap = {
    Writing: "📝",
    Compressing: "🗜️",
    Calculating: "🔐",
    Generating: "🔄",
    Building: "🔧",
  };

  return emojiMap[operation] || "🔄";
}
