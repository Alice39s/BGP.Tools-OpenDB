#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { runCommand } from "./utils.js";

function checkBranchExists(branchName) {
  try {
    const remoteRefs = runCommand("git ls-remote --heads origin");
    return remoteRefs.includes(`refs/heads/${branchName}`);
  } catch (error) {
    console.warn(
      "[!] Error checking remote branches, assuming branch does not exist",
    );
    return false;
  }
}

function ensureDataDirectories() {
  const dataDirs = ["table", "asns", "tags"];
  dataDirs.forEach((dir) => {
    if (!existsSync(dir)) {
      console.log(`[+] Creating data directory: ${dir}`);
      mkdirSync(dir, { recursive: true });
    }
  });
}

function setupAutoUpdateBranch() {
  console.log("[+] Setting up auto-update branch...");

  const currentBranch = runCommand("git branch --show-current");
  console.log(`[+] Current branch: ${currentBranch}`);

  // pull latest code
  runCommand("git fetch --all --prune");

  const branchExists = checkBranchExists("auto-update");

  if (branchExists) {
    console.log("[+] auto-update branch exists, switching and updating...");

    try {
      // switch to auto-update branch
      runCommand("git checkout auto-update");
      runCommand("git pull origin auto-update");
    } catch (error) {
      console.log(
        "[-] Unable to switch directly, attempting to track from remote...",
      );
      runCommand("git checkout -b auto-update origin/auto-update");
    }
  } else {
    console.log(
      "[+] auto-update branch does not exist, creating orphan branch...",
    );

    // create orphan branch (no history)
    runCommand("git checkout --orphan auto-update");

    // clean all files, only keep data directories
    runCommand("git reset --hard");
    runCommand("git clean -fd");

    // ensure data directories exist
    ensureDataDirectories();

    // create initial README
    writeFileSync(
      "README.md",
      `# BGP.Tools Auto-Update Branch

      This branch only contains automatically updated data files.

      Update time: \`${new Date().toISOString()}\`
      `,
    );

    // create initial commit
    runCommand("git add README.md table/ asns/ tags/");
    runCommand(
      `git commit -m "🚀 Initialize auto-update data branch at ${new Date().toISOString()}"`,
    );

    // push to remote to establish tracking
    runCommand("git push -u origin auto-update");
  }

  // ensure data directories exist (in case branch is empty)
  ensureDataDirectories();

  console.log("[+] auto-update branch setup completed");

  // show branch status
  const status = runCommand("git status --porcelain");
  if (status) {
    console.log("[+] Current changes:", status);
  } else {
    console.log("[+] Working directory clean");
  }
}

function main() {
  try {
    setupAutoUpdateBranch();
  } catch (error) {
    console.error("[-] Failed to setup auto-update branch:", error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { setupAutoUpdateBranch };
