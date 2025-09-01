import { createHash } from "crypto";
import { createReadStream } from "fs";
import { pipeline } from "stream/promises";

/**
 * Calculate SHA256 hash of a file
 * @param {string} filePath File path
 * @returns {Promise<string>} SHA256 hash (hexadecimal string)
 */
export async function calculateSHA256(filePath) {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);

  await pipeline(stream, hash);

  return hash.digest("hex");
}

/**
 * Calculate SHA256 hash of a string
 * @param {string} data String to hash
 * @returns {string} SHA256 hash (hexadecimal string)
 */
export function calculateStringSHA256(data) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Calculate hash values for multiple files in batch
 * @param {string[]} filePaths Array of file paths
 * @returns {Promise<Object>} Mapping from file path to hash value
 */
export async function calculateMultipleSHA256(filePaths) {
  const results = {};

  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        results[filePath] = await calculateSHA256(filePath);
      } catch (error) {
        console.warn(
          `Failed to calculate hash for file ${filePath}:`,
          error.message,
        );
        results[filePath] = null;
      }
    }),
  );

  return results;
}
