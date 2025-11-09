#!/usr/bin/env node

import {
  readFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
  cpSync,
  readdirSync,
} from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { runCommand } from "./utils.js";

const ALLOWED_ROOT_ENTRIES = new Set([
  "README.md",
  ".gitignore",
  "table",
  "asns",
  "tags",
]);

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
    const metaContent = runCommand(
      `git show ${branch}:${path}/index-meta.json`,
      {
        silent: true,
        ignoreError: true,
      },
    );
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
  
  const needsCleanup = branchNeedsCleanup();

  if (dirsToSync.length === 0 && !needsCleanup) {
    console.log("[+] No new data or cleanup tasks detected");
    return false;
  }

  if (dirsToSync.length > 0) {
    console.log(
      `[+] Found ${dirsToSync.length} directories to sync: ${dirsToSync.join(", ")}`,
    );
  }
  if (needsCleanup) {
    console.log("[+] auto-update branch contains unexpected files, scheduling cleanup");
  }

  const worktreePath = mkdtempSync(join(tmpdir(), "auto-update-"));
  console.log(`[+] Using temporary worktree: ${worktreePath}`);

  try {
    runCommand(`git worktree add --force ${worktreePath} auto-update`, {
      silent: true,
    });

    cleanupWorktree(worktreePath);

    for (const dir of dirsToSync) {
      const sourceDir = resolve(process.cwd(), dir);
      const targetDir = join(worktreePath, dir);

      if (!existsSync(sourceDir)) {
        console.warn(`[-] Source directory not found: ${sourceDir}`);
        continue;
      }

      console.log(`[+] Copying ${dir}/ into worktree...`);
      rmSync(targetDir, { recursive: true, force: true });
      cpSync(sourceDir, targetDir, { recursive: true });
      runCommand(`git add ${dir}/`, {
        cwd: worktreePath,
        silent: true,
      });
    }

    const autoUpdateStatus = runCommand("git status --porcelain", {
      cwd: worktreePath,
      silent: true,
    });

    if (autoUpdateStatus) {
      const timestamp =
        new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

      runCommand(
        `git commit -m "🔄 [Auto-Update] Data sync ${timestamp}"`,
        {
          cwd: worktreePath,
        },
      );

      runCommand("git push origin auto-update", { cwd: worktreePath });
      console.log("✅ Successfully pushed data to auto-update branch");
      return true;
    }

    console.log("[+] No changes to push to auto-update branch");
    return false;
  } finally {
    runCommand(`git worktree remove ${worktreePath} --force`, {
      silent: true,
      ignoreError: true,
    });

    rmSync(worktreePath, { recursive: true, force: true });
  }
}

function branchNeedsCleanup() {
  try {
    const treeOutput = runCommand("git ls-tree --name-only auto-update", {
      silent: true,
      ignoreError: true,
    });

    if (!treeOutput) return false;

    return treeOutput
      .split("\n")
      .filter(Boolean)
      .some((entry) => !ALLOWED_ROOT_ENTRIES.has(entry.split("/")[0]));
  } catch (error) {
    console.warn("[!] Failed to inspect auto-update branch:", error.message);
    return false;
  }
}

function cleanupWorktree(worktreePath) {
  let cleaned = false;
  const entries = readdirSync(worktreePath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".git") continue;
    if (ALLOWED_ROOT_ENTRIES.has(entry.name)) continue;

    const targetPath = join(worktreePath, entry.name);
    console.log(`[-] Removing unexpected entry from auto-update branch: ${entry.name}`);
    rmSync(targetPath, { recursive: true, force: true });
    runCommand(`git rm -rf --ignore-unmatch ${entry.name}`, {
      cwd: worktreePath,
      silent: true,
      ignoreError: true,
    });
    cleaned = true;
  }

  if (cleaned) {
    console.log("[+] auto-update worktree cleaned up");
  }
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
