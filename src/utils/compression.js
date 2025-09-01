import { createReadStream, createWriteStream } from "fs";
import { readFile, writeFile } from "fs/promises";
import { createGzip, createGunzip } from "zlib";
import { pipeline } from "stream/promises";
import {
  compress as xzCompress,
  decompress as xzDecompress,
} from "@napi-rs/lzma/xz";

/**
 * Compress file using gzip
 * @param {string} inputPath Input file path
 * @param {string} outputPath Output file path
 */
export async function compressGzip(inputPath, outputPath) {
  const readStream = createReadStream(inputPath);
  const writeStream = createWriteStream(outputPath);
  const gzipStream = createGzip({ level: 9 });

  await pipeline(readStream, gzipStream, writeStream);
}

/**
 * Decompress gzip file
 * @param {string} inputPath Input file path
 * @param {string} outputPath Output file path
 */
export async function decompressGzip(inputPath, outputPath) {
  const readStream = createReadStream(inputPath);
  const writeStream = createWriteStream(outputPath);
  const gunzipStream = createGunzip();

  await pipeline(readStream, gunzipStream, writeStream);
}

/**
 * Compress file using xz
 * @param {string} inputPath Input file path
 * @param {string} outputPath Output file path
 */
export async function compressXz(inputPath, outputPath) {
  try {
    const inputData = await readFile(inputPath);
    const compressedData = await xzCompress(inputData);
    await writeFile(outputPath, compressedData);
  } catch (error) {
    throw new Error(`xz compression failed: ${error.message}`);
  }
}

/**
 * Decompress xz file
 * @param {string} inputPath Input file path
 * @param {string} outputPath Output file path
 */
export async function decompressXz(inputPath, outputPath) {
  try {
    const compressedData = await readFile(inputPath);
    const decompressedData = await xzDecompress(compressedData);
    await writeFile(outputPath, decompressedData);
  } catch (error) {
    throw new Error(`xz decompression failed: ${error.message}`);
  }
}
