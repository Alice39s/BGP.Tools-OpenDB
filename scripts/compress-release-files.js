#!/usr/bin/env node

/**
 * Compress release files using NAPI xz implementation
 * Replaces system xz commands in CI workflows
 */

import { readFile, writeFile, copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { createGzip } from "zlib";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { compress as xzCompress } from "@napi-rs/lzma/xz";
import { resolve, dirname, basename } from "path";

/**
 * Compress file with gzip
 * @param {string} inputPath Input file path
 * @param {string} outputPath Output file path
 */
async function compressGzip(inputPath, outputPath) {
  const readStream = createReadStream(inputPath);
  const writeStream = createWriteStream(outputPath);
  const gzipStream = createGzip({ level: 9 });

  await pipeline(readStream, gzipStream, writeStream);
}

/**
 * Compress file with xz using NAPI
 * @param {string} inputPath Input file path
 * @param {string} outputPath Output file path
 */
async function compressXz(inputPath, outputPath) {
  try {
    const inputData = await readFile(inputPath);
    const compressedData = await xzCompress(inputData);
    await writeFile(outputPath, compressedData);
  } catch (error) {
    throw new Error(`xz compression failed for ${inputPath}: ${error.message}`);
  }
}

/**
 * Process a single file - copy and compress
 * @param {string} sourcePath Source file path
 * @param {string} releaseDate Release date string
 * @param {string} outputDir Output directory
 * @returns {Promise<Array<string>>} Array of generated file paths
 */
async function processFile(sourcePath, releaseDate, outputDir) {
  const sourceBasename = basename(sourcePath);
  const extension = sourceBasename.includes(".")
    ? "." + sourceBasename.split(".").slice(1).join(".")
    : "";
  const nameWithoutExt = sourceBasename.replace(extension, "");

  // Generate release filename
  const releaseFileName = `${nameWithoutExt}-${releaseDate}${extension}`;
  const releasePath = resolve(outputDir, releaseFileName);

  // Copy original file with release name
  await copyFile(sourcePath, releasePath);
  console.log(`📄 Copied ${sourceBasename} → ${releaseFileName}`);

  const generatedFiles = [releaseFileName];

  // Compress with gzip
  const gzipPath = `${releasePath}.gz`;
  await compressGzip(releasePath, gzipPath);
  console.log(`🗜️  Generated ${releaseFileName}.gz`);
  generatedFiles.push(`${releaseFileName}.gz`);

  // Compress with xz using NAPI
  const xzPath = `${releasePath}.xz`;
  await compressXz(releasePath, xzPath);
  console.log(`🗜️  Generated ${releaseFileName}.xz`);
  generatedFiles.push(`${releaseFileName}.xz`);

  return generatedFiles;
}

/**
 * Main function to process all release files
 */
async function main() {
  const releaseDate =
    process.env.RELEASE_DATE || new Date().toISOString().split("T")[0];
  const outputDir = resolve(process.cwd(), "release-assets");

  console.log(
    `🚀 Generating ${releaseDate} release files from existing data...`,
  );

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const generatedFiles = [];
  let hasFiles = false;

  // Process table data
  const tablePath = "table/table-original.jsonl";
  if (existsSync(tablePath)) {
    const files = await processFile(tablePath, releaseDate, outputDir);
    generatedFiles.push(...files);
    hasFiles = true;
  } else {
    console.log("❌ table/table-original.jsonl not found");
  }

  // Process ASN data
  const asnsPath = "asns/asns.csv";
  if (existsSync(asnsPath)) {
    const files = await processFile(asnsPath, releaseDate, outputDir);
    generatedFiles.push(...files);
    hasFiles = true;
  } else {
    console.log("❌ asns/asns.csv not found");
  }

  // Process tags data
  const tagsDir = "tags";
  if (existsSync(tagsDir)) {
    const { readdir, stat } = await import("fs/promises");
    const entries = await readdir(tagsDir);

    for (const entry of entries) {
      const tagDir = resolve(tagsDir, entry);
      const tagStat = await stat(tagDir);

      if (tagStat.isDirectory()) {
        const tagName = entry;
        const csvFile = resolve(tagDir, `tags-${tagName}.csv`);

        if (existsSync(csvFile)) {
          const files = await processFile(csvFile, releaseDate, outputDir);
          // Rename tag files to include tag name
          const renamedFiles = files.map((file) => {
            const newName = file.replace(
              `tags-${tagName}-`,
              `tags-${tagName}-`,
            );
            return newName;
          });
          generatedFiles.push(...renamedFiles);
          hasFiles = true;
        }
      }
    }
  }

  if (!hasFiles) {
    console.log("❌ No source files found for release");
    process.exit(1);
  }

  console.log(`✅ Generated ${generatedFiles.length} files:`);
  generatedFiles.forEach((file) => console.log(`   - ${file}`));
}

// Run main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
}
