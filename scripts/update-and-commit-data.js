#!/usr/bin/env node

import { runCommand } from "./utils.js";

function commitChanges(path) {
  console.log(`📊 ${path} data updated, ready for sync to auto-update branch`);
  return true;
}

function updateTableData() {
  console.log("🔄 updating routing table data...");
  runCommand("pnpm run fetch:table", { inherit: true });
  return commitChanges("table");
}

function updateAsnsData() {
  console.log("🔄 updating ASN mapping data...");
  runCommand("pnpm run fetch:asns", { inherit: true });
  return commitChanges("asns");
}

function updateTagsData() {
  console.log("🔄 updating tag data...");
  runCommand("pnpm run fetch:tags", { inherit: true });
  return commitChanges("tags");
}

function updateAllData() {
  console.log("🔄 updating all data...");
  const results = {
    table: false,
    asns: false,
    tags: false,
  };

  // use parallel way to update data (but serial commit to avoid conflicts)
  try {
    // first execute all data fetching
    runCommand("pnpm run fetch:all", { inherit: true });

    // then check and commit each data type
    results.table = commitChanges("table");
    results.asns = commitChanges("asns");
    results.tags = commitChanges("tags");
  } catch (error) {
    console.error("❌ batch update failed, trying to update individually...");
    results.table = updateTableData();
    results.asns = updateAsnsData();
    results.tags = updateTagsData();
  }

  return results;
}

function main() {
  const dataType = process.argv[2] || "all";
  const updateMode = process.argv[3] || "regular"; // regular | daily

  console.log(
    `🚀 starting data update - type: ${dataType}, mode: ${updateMode}`,
  );

  let hasAnyChanges = false;

  try {
    switch (dataType) {
      case "table":
        hasAnyChanges = updateTableData();
        break;

      case "asns":
        hasAnyChanges = updateAsnsData();
        break;

      case "tags":
        hasAnyChanges = updateTagsData();
        break;

      case "all": {
        const results = updateAllData();
        hasAnyChanges = Object.values(results).some((changed) => changed);

        console.log("📋 update results summary:");
        console.log(
          `  - routing table: ${results.table ? "✅ updated" : "⭕ no changes"}`,
        );
        console.log(
          `  - ASN data: ${results.asns ? "✅ updated" : "⭕ no changes"}`,
        );
        console.log(
          `  - tag data: ${results.tags ? "✅ updated" : "⭕ no changes"}`,
        );
        break;
      }

      default:
        throw new Error(`unsupported data type: ${dataType}`);
    }

    if (hasAnyChanges) {
      console.log("✅ data update completed, with new changes");
      // note: DO NOT push here, let the caller decide when to push
    } else {
      console.log("✅ data update completed, no changes");
    }

    // Always return success (0) - let the workflow decide what to do
    // The workflow can check for staged changes to determine next steps
    process.exit(0);
  } catch (error) {
    console.error("❌ data update failed:", error.message);
    process.exit(2);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  updateTableData,
  updateAsnsData,
  updateTagsData,
  updateAllData,
  commitChanges,
};
