#!/usr/bin/env node

import { runCommand } from "./utils.js";

function hasChanges(path) {
  const status = runCommand(`git status --porcelain ${path}`, { silent: true });
  return status.length > 0;
}

function commitChanges(path) {
  if (hasChanges(path)) {
    console.log(`📊 detected changes in ${path} data`);
    // @NOTE: Only add to staging, don't commit yet
    // Let the main workflow handle commits and pushes
    runCommand(`git add ${path}/`);
    console.log(`✅ staged ${path} changes for commit`);
    return true;
  } else {
    console.log(`📊 ${path} data has no changes`);
    return false;
  }
}

function updateTableData() {
  console.log("🔄 updating routing table data...");
  runCommand("node src/index.js fetch-table");
  return commitChanges("table");
}

function updateAsnsData() {
  console.log("🔄 updating ASN mapping data...");
  runCommand("node src/index.js fetch-asns");
  return commitChanges("asns");
}

function updateTagsData() {
  console.log("🔄 updating tag data...");
  runCommand("node src/index.js fetch-tags");
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
    runCommand("node src/index.js fetch-all");

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

function pushChanges() {
  if (hasChanges("")) {
    console.log("📤 pushing changes to auto-update branch");
    runCommand("git push origin auto-update");
    console.log("✅ changes pushed successfully");
    return true;
  } else {
    console.log("📤 no changes to push");
    return false;
  }
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
  pushChanges,
  hasChanges,
  commitChanges,
};
