import { writeFile, readFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { parseTableData, separateByIPVersion } from "../fetchers/table.js";

const execAsync = promisify(exec);

/**
 * Generate MMDB database file using Go binary
 * @param {string} rawTableData Raw routing table data
 * @param {string} outputPath Output file path
 */
export async function generateMMDB(
  rawTableData,
  outputPath = "table/table.mmdb",
) {
  console.log("🔄 Starting MMDB database generation using Go binary...");

  try {
    // Check if Go binary exists
    const binaryPath = "./mmdbwriter.bin";
    console.log(`🔍 Checking Go binary at: ${binaryPath}`);

    // Parse routing table data
    const tableData = parseTableData(rawTableData);
    const { ipv4, ipv6 } = separateByIPVersion(tableData);

    console.log(`📊 IPv4 entries: ${ipv4.length}, IPv6 entries: ${ipv6.length}`);
    console.log(`🔄 Total entries to process: ${ipv4.length + ipv6.length}`);

    // Create temporary CSV file for Go binary input
    const csvData = convertToCSV([...ipv4, ...ipv6]);
    const tempCsvPath = `${outputPath}.temp.csv`;
    await writeFile(tempCsvPath, csvData, "utf8");

    console.log(`📝 Created temporary CSV file: ${tempCsvPath}`);

    // Call Go binary to generate MMDB
    console.log("🚀 Executing Go binary for MMDB generation...");

    const command = `${binaryPath} "${tempCsvPath}" "${outputPath}"`;
    console.log(`📋 Command: ${command}`);

    const { stdout, stderr } = await execAsync(command);

    if (stdout) {
      console.log("📄 Go binary stdout:");
      console.log(stdout);
    }

    if (stderr) {
      console.log("⚠️  Go binary stderr:");
      console.log(stderr);
    }

    // Clean up temporary file
    try {
      await execAsync(`rm -f "${tempCsvPath}"`);
      console.log("🧹 Cleaned up temporary CSV file");
    } catch (cleanupError) {
      console.warn("⚠️  Warning: Failed to clean up temporary file:", cleanupError.message);
    }

    console.log(`✅ MMDB database generation completed: ${outputPath}`);
    console.log(`📊 Processed ${ipv4.length + ipv6.length} network entries`);

    // Return basic info about the generated file
    return {
      outputPath,
      ipv4Count: ipv4.length,
      ipv6Count: ipv6.length,
      totalCount: ipv4.length + ipv6.length,
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error("❌ MMDB generation failed:", error.message);
    throw new Error(`MMDB generation failed: ${error.message}`);
  }
}

/**
 * Convert table data to CSV format for Go binary input
 * @param {Array} tableData Array of routing table entries
 * @returns {string} CSV formatted data
 */
function convertToCSV(tableData) {
  const header = "network,asn,hits\n";
  const rows = tableData.map(entry =>
    `"${entry.CIDR}",${entry.ASN},${entry.Hits || 0}`
  ).join("\n");

  return header + rows;
}

/**
 * Parse CIDR notation (kept for potential future use)
 * @param {string} cidr Network address in CIDR format
 * @returns {Object|null} Parsed network information
 */
function parseCIDR(cidr) {
  try {
    const [network, prefixLengthStr] = cidr.split("/");
    const prefixLength = parseInt(prefixLengthStr);

    if (!network || isNaN(prefixLength)) {
      return null;
    }

    // Simple IP address validation and conversion
    let networkInt;
    if (network.includes(":")) {
      // IPv6 - simplified processing
      networkInt = ipv6ToInt(network);
    } else {
      // IPv4
      networkInt = ipv4ToInt(network);
    }

    return {
      network,
      prefixLength,
      networkInt,
    };
  } catch (error) {
    console.warn(`Warning: Unable to parse CIDR ${cidr}:`, error.message);
    return null;
  }
}

/**
 * Convert IPv4 address to integer
 * @param {string} ip IPv4 address
 * @returns {number} Integer representation
 */
function ipv4ToInt(ip) {
  const parts = ip.split(".");
  return (
    (parseInt(parts[0]) << 24) +
    (parseInt(parts[1]) << 16) +
    (parseInt(parts[2]) << 8) +
    parseInt(parts[3])
  );
}

/**
 * Convert IPv6 address to big integer (simplified version)
 * @param {string} ip IPv6 address
 * @returns {BigInt} Big integer representation
 */
function ipv6ToInt(ip) {
  // This is simplified IPv6 processing, production needs complete implementation
  const expanded = expandIPv6(ip);
  const hex = expanded.replace(/:/g, "");
  return BigInt("0x" + hex);
}

/**
 * Simplified version of IPv6 address expansion
 * @param {string} ip IPv6 address
 * @returns {string} Full format IPv6 address
 */
function expandIPv6(ip) {
  // This is a very simplified implementation
  // Production needs complete IPv6 address processing
  if (ip.includes("::")) {
    const parts = ip.split("::");
    const left = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];
    const missing = 8 - left.length - right.length;
    const middle = Array(missing).fill("0000");
    return [...left, ...middle, ...right]
      .map((part) => part.padStart(4, "0"))
      .join(":");
  }
  return ip
    .split(":")
    .map((part) => part.padStart(4, "0"))
    .join(":");
}

/**
 * Query ASN information for IP address using MMDB file
 * Note: This is a placeholder for future MMDB reader implementation
 * For now, this function is not implemented as it requires MMDB reader library
 * @param {string} mmdbPath Path to MMDB file
 * @param {string} ip IP address
 * @returns {Object|null} ASN information
 */
export function lookupASN(mmdbPath, ip) {
  console.log(`🔍 MMDB lookup requested for IP: ${ip}`);
  console.log(`📁 MMDB file: ${mmdbPath}`);
  console.log("⚠️  Note: MMDB lookup requires specialized MMDB reader library");
  console.log("💡 Consider using libraries like 'maxmind-db-reader' for Node.js");

  // Placeholder - in production, you would use a proper MMDB reader
  return {
    note: "MMDB lookup not implemented yet",
    ip: ip,
    mmdbPath: mmdbPath,
    requires: "MMDB reader library",
  };
}