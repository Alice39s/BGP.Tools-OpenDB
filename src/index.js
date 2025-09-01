#!/usr/bin/env node

/**
 * BGP.Tools-OpenDB Main Entry Point
 * Coordinates various data processing tasks
 *
 * @author Alice39s
 * @version 1.0.0
 * @license MIT
 * @repository https://github.com/Alice39s/BGP.Tools-OpenDB
 */

import { Command } from "commander";
import { fetchTable } from "./fetchers/table.js";
import { fetchASNs } from "./fetchers/asns.js";
import { fetchTags } from "./fetchers/tags.js";
import { processTableData } from "./processors/table.js";
import { processASNData } from "./processors/asns.js";
import { processTagsData } from "./processors/tags.js";

const program = new Command();

program
  .name("bgp-opendb")
  .description("BGP.Tools OpenDB Data Processing Tool")
  .version("1.0.0");

program
  .command("fetch-table")
  .description("Fetch and process routing table data")
  .action(async () => {
    try {
      console.log("📡 Fetching routing table data...");
      const data = await fetchTable();
      console.log("🔄 Processing routing table data...");
      await processTableData(data);
      console.log("✅ Routing table data processed successfully");
    } catch (error) {
      console.error("❌ Routing table processing failed:", error.message);
      process.exit(1);
    }
  });

program
  .command("fetch-asns")
  .description("Fetch and process ASN mapping data")
  .action(async () => {
    try {
      console.log("📡 Fetching ASN mapping data...");
      const data = await fetchASNs();
      console.log("🔄 Processing ASN mapping data...");
      await processASNData(data);
      console.log("✅ ASN mapping data processed successfully");
    } catch (error) {
      console.error("❌ ASN mapping processing failed:", error.message);
      process.exit(1);
    }
  });

program
  .command("fetch-tags")
  .description("Fetch and process tag data")
  .action(async () => {
    try {
      console.log("📡 Fetching tag data...");
      const tagsList = await fetchTags();
      console.log("🔄 Processing tag data...");
      await processTagsData(tagsList);
      console.log("✅ Tag data processed successfully");
    } catch (error) {
      console.error("❌ Tag data processing failed:", error.message);
      process.exit(1);
    }
  });

program
  .command("fetch-all")
  .description("Fetch and process all data")
  .action(async () => {
    try {
      console.log("🚀 Starting to fetch all data...");

      // Fetch all data in parallel
      const [tableData, asnData, tagsList] = await Promise.all([
        fetchTable(),
        fetchASNs(),
        fetchTags(),
      ]);

      console.log("🔄 Processing all data...");

      // Process all data in parallel
      await Promise.all([
        processTableData(tableData),
        processASNData(asnData),
        processTagsData(tagsList),
      ]);

      console.log("✅ All data processed successfully");
    } catch (error) {
      console.error("❌ Data processing failed:", error.message);
      process.exit(1);
    }
  });

program.parse();
