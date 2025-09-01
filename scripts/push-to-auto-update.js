#!/usr/bin/env node

import { runCommand } from "./utils.js";

function hasChangesInDataDirs() {
  const dataDirs = ["table", "asns", "tags"];
  for (const dir of dataDirs) {
    const status = runCommand(`git status --porcelain ${dir}/`, {
      silent: true,
    });
    if (status.length > 0) {
      return true;
    }
  }
  return false;
}

function isAutoUpdateBranchEmpty() {
  try {
    // Use git ls-tree to check files in auto-update branch without switching
    const dataDirs = ["table", "asns", "tags"];
    let hasDataFiles = false;
    
    for (const dir of dataDirs) {
      try {
        // List files in the directory on auto-update branch
        const files = runCommand(`git ls-tree -r --name-only origin/auto-update ${dir}/ 2>/dev/null || echo ""`, { silent: true });
        const dataFiles = files.split('\n').filter(f => 
          f.trim() && (
            f.includes('.json') || 
            f.includes('.csv') || 
            f.includes('.mmdb')
          )
        );
        
        if (dataFiles.length > 0) {
          hasDataFiles = true;
          break;
        }
      } catch (error) {
        // Directory might not exist or be empty
        continue;
      }
    }
    
    return !hasDataFiles;
  } catch (error) {
    console.warn("[-] Could not check auto-update branch status:", error.message);
    // Default to assuming it's empty so we force sync
    return true;
  }
}

function pushToAutoUpdate() {
  console.log("[+] Checking for data changes to push to auto-update branch...");
  
  const hasChanges = hasChangesInDataDirs();
  const isEmpty = isAutoUpdateBranchEmpty();
  
  if (!hasChanges && !isEmpty) {
    console.log("[+] No changes in data directories and auto-update branch has data, nothing to push");
    return false;
  }
  
  if (isEmpty) {
    console.log("[+] Auto-update branch is empty, forcing initial data sync...");
  } else {
    console.log("[+] Found changes in data directories, proceeding with sync...");
  }

  const originalBranch = runCommand("git branch --show-current");
  console.log(`[+] Current branch: ${originalBranch}`);

  try {
    // If auto-update branch is empty, we need to force sync all data
    if (isEmpty) {
      console.log("[+] Forcing sync of all existing data files...");
      // Don't stage changes in main branch, just copy existing files
    } else {
      // Stage all data changes in current branch
      console.log("[+] Staging data changes...");
      runCommand("git add table/ asns/ tags/");

      // Commit changes in current branch if there are any staged changes
      const stagedChanges = runCommand("git diff --cached --name-only", {
        silent: true,
      });
      if (stagedChanges) {
        const timestamp =
          new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
        runCommand(`git commit -m "🔄 [Auto-Update] Data updates ${timestamp}"`);
        console.log("[+] Committed data changes to main branch");
      }
    }

    // Switch to auto-update branch
    console.log("[+] Switching to auto-update branch...");
    runCommand("git checkout auto-update");

    // Pull latest from auto-update to avoid conflicts
    runCommand("git pull origin auto-update", { ignoreError: true });

    // Copy data directories from main branch
    console.log("[+] Copying data from main branch...");
    runCommand(`git checkout ${originalBranch} -- table/ asns/ tags/`);

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
        `git commit -m "🔄 [Auto-Update] Sync data from main ${timestamp}"`,
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

export { pushToAutoUpdate, hasChangesInDataDirs, isAutoUpdateBranchEmpty };
