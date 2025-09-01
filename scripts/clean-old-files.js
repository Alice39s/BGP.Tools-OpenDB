#!/usr/bin/env node

import { readdir, stat, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const RETENTION_POLICIES = {
  table: {
    pattern: /^table-.*\.jsonl.*$/,
    keep: 24,
    description: "routing table files",
  },
  asns: {
    pattern: /^asns-.*\.csv.*$/,
    keep: 3,
    description: "ASN mapping files",
  },
  tags: {
    pattern: /^tags-.*-.*\.csv.*$/,
    keep: 3,
    description: "tag data files",
  },
};

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: "utf8",
      stdio: options.silent ? "pipe" : "inherit",
      ...options,
    });
    return result ? result.trim() : "";
  } catch (error) {
    if (!options.ignoreError) {
      console.error(`❌ command failed: ${command}`);
      console.error(error.message);
      throw error;
    }
    return "";
  }
}

async function getFilesByModTime(directory, pattern) {
  if (!existsSync(directory)) {
    console.log(`⚠️ directory does not exist: ${directory}`);
    return [];
  }

  try {
    const files = await readdir(directory);
    const matchedFiles = [];

    for (const file of files) {
      if (pattern.test(file)) {
        const filePath = join(directory, file);
        const stats = await stat(filePath);
        matchedFiles.push({
          path: filePath,
          name: file,
          mtime: stats.mtime.getTime(),
        });
      }
    }

    // sort by modification time (latest first)
    return matchedFiles.sort((a, b) => b.mtime - a.mtime);
  } catch (error) {
    console.error(`❌ read directory failed ${directory}:`, error.message);
    return [];
  }
}

async function cleanOldFiles(dataType) {
  const policy = RETENTION_POLICIES[dataType];
  if (!policy) {
    throw new Error(`unsupported data type: ${dataType}`);
  }

  console.log(
    `🧹 cleaning old ${policy.description}, keeping latest ${policy.keep} versions...`,
  );

  const files = await getFilesByModTime(dataType, policy.pattern);

  if (files.length <= policy.keep) {
    console.log(
      `📁 ${dataType}/ directory has ${files.length} files, no need to clean`,
    );
    return false;
  }

  const filesToDelete = files.slice(policy.keep);
  console.log(
    `📁 found ${files.length} files, will delete the oldest ${filesToDelete.length} files:`,
  );

  let deletedCount = 0;
  for (const file of filesToDelete) {
    try {
      await unlink(file.path);
      console.log(`  ✅ deleted: ${file.name}`);
      deletedCount++;
    } catch (error) {
      console.error(`  ❌ delete failed: ${file.name} - ${error.message}`);
    }
  }

  if (deletedCount > 0) {
    console.log(`✅ successfully cleaned ${deletedCount} old files`);
    return true;
  } else {
    console.log("⚠️ no files were deleted");
    return false;
  }
}

async function cleanAllOldFiles() {
  const results = {
    table: false,
    asns: false,
    tags: false,
  };

  for (const [dataType] of Object.entries(RETENTION_POLICIES)) {
    try {
      results[dataType] = await cleanOldFiles(dataType);
    } catch (error) {
      console.error(`❌ clean ${dataType} failed:`, error.message);
      results[dataType] = false;
    }
  }

  return results;
}

function commitCleanup(dataType, hasChanges) {
  if (!hasChanges) return false;

  try {
    // @NOTE: Only add to staging, don't commit yet
    // Let the main workflow handle commits and pushes
    runCommand(`git add ${dataType}/`);
    
    console.log(`✅ staged ${dataType} cleanup changes for commit`);
    return true;
  } catch (error) {
    console.error(`❌ stage ${dataType} cleanup failed:`, error.message);
    return false;
  }
}

async function main() {
  const dataType = process.argv[2] || "all";

  console.log(`🚀 starting to clean old files - type: ${dataType}`);

  try {
    if (dataType === "all") {
      const results = await cleanAllOldFiles();
      let hasAnyChanges = false;

      // commit each data type cleanup
      for (const [type, hasChanges] of Object.entries(results)) {
        const committed = commitCleanup(type, hasChanges);
        hasAnyChanges = hasAnyChanges || committed;
      }

      // output cleanup results summary
      console.log("📋 cleanup results summary:");
      console.log(
        `  - routing table files: ${results.table ? "✅ cleaned" : "⭕ no need to clean"}`,
      );
      console.log(
        `  - ASN files: ${results.asns ? "✅ cleaned" : "⭕ no need to clean"}`,
      );
      console.log(
        `  - tag files: ${results.tags ? "✅ cleaned" : "⭕ no need to clean"}`,
      );

      if (hasAnyChanges) {
        console.log("✅ file cleanup completed, with new changes");
      } else {
        console.log("✅ file cleanup completed, no changes");
      }
    } else {
      const hasChanges = await cleanOldFiles(dataType);
      const committed = commitCleanup(dataType, hasChanges);

      if (committed) {
        console.log("✅ file cleanup completed, with new changes");
      } else {
        console.log("✅ file cleanup completed, no changes");
      }
    }
  } catch (error) {
    console.error("❌ file cleanup failed:", error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { cleanOldFiles, cleanAllOldFiles, commitCleanup, RETENTION_POLICIES };
