#!/usr/bin/env node

import { readFileSync, existsSync, rmSync, cpSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { runCommand, withWorktree } from "./utils.js";

const ALLOWED_ROOT_ENTRIES = new Set([
  "README.md",
  ".gitignore",
  "table",
  "asns",
  "tags",
]);

function getLocalTimestamp(path) {
  try {
    const metaContent = readFileSync(`${path}/index-meta.json`, "utf8");
    const meta = JSON.parse(metaContent);
    return meta.timestamp;
  } catch {
    return null;
  }
}

function getBranchTimestamp(path, branch) {
  try {
    const metaContent = runCommand(`git show ${branch}:${path}/index-meta.json`, {
      quiet: true,
      allowFailure: true,
    });
    if (!metaContent) return null;
    const meta = JSON.parse(metaContent);
    return meta.timestamp;
  } catch {
    return null;
  }
}

function needsUpdate(path) {
  const newTimestamp = getLocalTimestamp(path);
  const autoUpdateTimestamp = getBranchTimestamp(path, "auto-update");

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
      `📊 ${path} timestamp mismatch: new(${newTimestamp}) vs current(${autoUpdateTimestamp})`,
    );
    return true;
  }

  console.log(`📊 ${path} timestamps match (${newTimestamp}), no update needed`);
  return false;
}

function pushToAutoUpdate() {
  console.log("[+] Checking for new data to sync to auto-update branch...");

  const dirsToSync = ["table", "asns", "tags"].filter((dir) => needsUpdate(dir));
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

  runCommand("git fetch origin auto-update:auto-update", {
    inherit: true,
    allowFailure: true,
  });

  return withWorktree(
    "auto-update",
    (worktreePath) => {
      cleanupWorktree(worktreePath);

      dirsToSync.forEach((dir) => syncDirectory(dir, worktreePath));

      const status = runCommand("git status --porcelain", {
        cwd: worktreePath,
        quiet: true,
      });

      if (!status) {
        console.log("[+] No changes to push to auto-update branch");
        return false;
      }

      const timestamp =
        new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

      runCommand(`git commit -m "🔄 [Auto-Update] Data sync ${timestamp}"`, {
        cwd: worktreePath,
        inherit: true,
      });

      runCommand("git push origin auto-update", {
        cwd: worktreePath,
        inherit: true,
      });

      console.log("✅ Successfully pushed data to auto-update branch");
      return true;
    },
    { label: "auto-update-sync", force: true },
  );
}

function branchNeedsCleanup() {
  try {
    const treeOutput = runCommand("git ls-tree --name-only auto-update", {
      quiet: true,
      allowFailure: true,
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
      quiet: true,
      allowFailure: true,
    });
    cleaned = true;
  }

  if (cleaned) {
    console.log("[+] auto-update worktree cleaned up");
  }
}

function syncDirectory(dir, worktreePath) {
  const sourceDir = resolve(process.cwd(), dir);
  const targetDir = join(worktreePath, dir);

  if (!existsSync(sourceDir)) {
    console.warn(`[-] Source directory not found: ${sourceDir}`);
    return;
  }

  console.log(`[+] Copying ${dir}/ into worktree...`);
  rmSync(targetDir, { recursive: true, force: true });
  cpSync(sourceDir, targetDir, { recursive: true });
  runCommand(`git add ${dir}/`, {
    cwd: worktreePath,
    inherit: true,
  });
}

function main() {
  try {
    pushToAutoUpdate();
  } catch (error) {
    console.error("[-] Failed to push to auto-update branch:", error.message);
    console.error("💡 Tips: Ensure Git credentials have write permissions, or manually run `git fetch --all --prune` and try again.");
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { pushToAutoUpdate };
