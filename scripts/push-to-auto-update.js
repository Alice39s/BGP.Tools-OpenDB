#!/usr/bin/env node

import { readFileSync } from 'fs';
import { runCommand } from "./utils.js";

function getLocalTimestamp(path) {
  try {
    // Read from local file system (newly generated files)
    const metaContent = readFileSync(`${path}/index-meta.json`, "utf8");
    const meta = JSON.parse(metaContent);
    return meta.timestamp;
  } catch (error) {
    return null;
  }
}

function getBranchTimestamp(path, branch) {
  try {
    // Read from specific branch
    const metaContent = runCommand(`git show ${branch}:${path}/index-meta.json`, {
      silent: true,
    });
    const meta = JSON.parse(metaContent);
    return meta.timestamp;
  } catch (error) {
    return null;
  }
}

function needsUpdate(path) {
  const newTimestamp = getLocalTimestamp(path); // 本地生成的新文件
  const autoUpdateTimestamp = getBranchTimestamp(path, "auto-update"); // auto-update 分支现有文件

  if (newTimestamp === null) {
    console.log(`📊 ${path} has no new data file, skipping`);
    return false;
  }

  if (autoUpdateTimestamp === null) {
    console.log(`📊 ${path} not found in auto-update branch, needs sync`);
    return true;
  }

  if (newTimestamp !== autoUpdateTimestamp) {
    console.log(
      `📊 ${path} timestamp mismatch: new(${newTimestamp}) vs current(${autoUpdateTimestamp})`
    );
    return true;
  }

  console.log(`📊 ${path} timestamps match (${newTimestamp}), no update needed`);
  return false;
}


function pushToAutoUpdate() {
  console.log("[+] Checking for new data to sync to auto-update branch...");
  
  // Determine which directories need syncing BEFORE switching branches
  const dataDirs = ["table", "asns", "tags"];
  const dirsToSync = dataDirs.filter(dir => needsUpdate(dir));
  
  if (dirsToSync.length === 0) {
    console.log("[+] No new data to sync, all timestamps match");
    return false;
  }
  
  console.log(`[+] Found ${dirsToSync.length} directories to sync: ${dirsToSync.join(", ")}`);

  const originalBranch = runCommand("git branch --show-current");
  console.log(`[+] Current branch: ${originalBranch}`);
  let stashCreated = false;

  try {
    // Switch to auto-update branch
    console.log("[+] Switching to auto-update branch...");
    
    // Stash any uncommitted changes to avoid conflicts
    const uncommittedChanges = runCommand("git status --porcelain", { silent: true });
    if (uncommittedChanges) {
      console.log("[+] Found uncommitted changes, stashing them...");
      runCommand("git stash push -m 'Auto-stash before branch switch'");
      stashCreated = true;
    }
    
    runCommand("git checkout auto-update");

    // Pull latest from auto-update to avoid conflicts
    runCommand("git pull origin auto-update", { ignoreError: true });

    // Add the new data files to git
    console.log("[+] Adding new data files to auto-update branch...");
    for (const dir of dirsToSync) {
      console.log(`[+] Adding ${dir}/ directory...`);
      // The data files should still be in working directory from when we were on main branch
      runCommand(`git add ${dir}/`);
    }

    // Check if there are changes in auto-update branch
    const autoUpdateStatus = runCommand("git status --porcelain", {
      silent: true,
    });
    if (autoUpdateStatus) {
      console.log("[+] Found changes in auto-update branch, committing...");
      runCommand("git add .");

      const timestamp =
        new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
      runCommand(
        `git commit -m "🔄 [Auto-Update] Data sync ${timestamp}"`,
      );

      // Push to remote
      console.log("[+] Pushing to auto-update branch...");
      runCommand("git push origin auto-update");

      console.log("✅ Successfully pushed data to auto-update branch");
    } else {
      console.log("[+] No changes to push to auto-update branch");
    }
  } finally {
    // Always switch back to original branch
    console.log(`[+] Switching back to ${originalBranch} branch...`);
    runCommand(`git checkout ${originalBranch}`);
    
    // Restore stashed changes if we created a stash
    if (stashCreated && originalBranch === "main") {
      try {
        console.log("[+] Restoring stashed changes...");
        runCommand("git stash pop");
      } catch (error) {
        console.warn("[-] Warning: Could not restore stashed changes:", error.message);
      }
    }
  }

  return true;
}

function main() {
  try {
    pushToAutoUpdate();
  } catch (error) {
    console.error("[-] Failed to push to auto-update branch:", error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { pushToAutoUpdate };
