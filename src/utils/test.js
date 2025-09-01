#!/usr/bin/env node

import { isValidCIDR, isValidASN } from "./errors.js";
import { logInfo, logSuccess, logError } from "./logger.js";
import { measureTime } from "./logger.js";

/**
 * Simple test runner
 * @param {string} name Test name
 * @param {Function} testFn Test function
 * @returns {Promise<boolean>} Test result
 */
async function test(name, testFn) {
  try {
    await measureTime(name, testFn);
    logSuccess(`✅ ${name}`);
    return true;
  } catch (error) {
    logError(`❌ ${name}`, error);
    return false;
  }
}

/**
 * Run validation tests
 */
async function runValidationTests() {
  logInfo("Running validation tests...");

  const results = await Promise.all([
    test("CIDR validation - IPv4", () => {
      if (!isValidCIDR("192.168.1.0/24"))
        throw new Error("Valid IPv4 CIDR rejected");
      if (!isValidCIDR("10.0.0.0/8"))
        throw new Error("Valid IPv4 CIDR rejected");
      if (isValidCIDR("192.168.1.0/33"))
        throw new Error("Invalid IPv4 CIDR accepted");
      if (isValidCIDR("300.168.1.0/24"))
        throw new Error("Invalid IPv4 CIDR accepted");
    }),

    test("CIDR validation - IPv6", () => {
      if (!isValidCIDR("2001:db8::/32"))
        throw new Error("Valid IPv6 CIDR rejected");
      if (!isValidCIDR("::1/128")) throw new Error("Valid IPv6 CIDR rejected");
      if (isValidCIDR("2001:db8::/129"))
        throw new Error("Invalid IPv6 CIDR accepted");
    }),

    test("ASN validation", () => {
      if (!isValidASN(65001)) throw new Error("Valid ASN rejected");
      if (!isValidASN("65001")) throw new Error("Valid ASN string rejected");
      if (isValidASN(0)) throw new Error("Invalid ASN (0) accepted");
      if (isValidASN(-1)) throw new Error("Invalid ASN (negative) accepted");
      if (isValidASN(4294967296))
        throw new Error("Invalid ASN (too large) accepted");
    }),
  ]);

  return results.every(Boolean);
}

/**
 * Run performance tests
 */
async function runPerformanceTests() {
  logInfo("Running performance tests...");

  const results = await Promise.all([
    test("Large array processing", async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const sum = largeArray.reduce((acc, val) => acc + val, 0);
      if (sum !== 49995000) throw new Error("Array processing failed");
    }),

    test("JSON parsing performance", async () => {
      const testData = {
        entries: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `entry${i}`,
        })),
      };
      const jsonString = JSON.stringify(testData);
      const parsed = JSON.parse(jsonString);
      if (parsed.entries.length !== 1000)
        throw new Error("JSON parsing failed");
    }),
  ]);

  return results.every(Boolean);
}

/**
 * Main test runner
 */
async function main() {
  logInfo("Starting BGP OpenDB tests...");

  const validationResult = await runValidationTests();
  const performanceResult = await runPerformanceTests();

  const allPassed = validationResult && performanceResult;

  if (allPassed) {
    logSuccess("🎉 All tests passed!");
    process.exit(0);
  } else {
    logError("💥 Some tests failed!");
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logError("Test runner failed", error);
    process.exit(1);
  });
}

export { test, runValidationTests, runPerformanceTests };
