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

  const originalBranch = runCommand("git branch --show-current");
  console.log(`[+] Current branch: ${originalBranch}`);

  // pull latest code
  runCommand("git fetch --all --prune");

  const branchExists = checkBranchExists("auto-update");

  if (!branchExists) {
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

    // create .gitignore file
    writeFileSync(
      ".gitignore",
      `node_modules/
*.bin
`,
    );

    // create initial commit
    runCommand("git add README.md .gitignore table/ asns/ tags/");
    runCommand(
      `git commit -m "🚀 Initialize auto-update data branch at ${new Date().toISOString()}"`,
    );

    // push to remote to establish tracking
    runCommand("git push -u origin auto-update");

    console.log("[+] auto-update branch created and pushed");
  } else {
    console.log("[+] auto-update branch already exists");
  }

  // @IMPORTANT: switch back to original branch for data processing
  if (originalBranch !== "auto-update") {
    console.log(
      `[+] Switching back to ${originalBranch} branch for data processing...`,
    );
    runCommand(`git checkout ${originalBranch}`);
  }

  console.log("[+] auto-update branch setup completed");

  // show current branch status
  const currentBranch = runCommand("git branch --show-current");
  console.log(`[+] Current branch: ${currentBranch}`);
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
