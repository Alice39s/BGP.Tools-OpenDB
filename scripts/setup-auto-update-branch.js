#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { runCommand, withWorktree } from "./utils.js";

function checkBranchExists(branchName) {
  const refs = runCommand(`git ls-remote --heads origin ${branchName}`, {
    quiet: true,
    allowFailure: true,
  });
  return Boolean(refs);
}

function ensureDataDirectories(basePath = ".") {
  const dataDirs = ["table", "asns", "tags"];
  dataDirs.forEach((dir) => {
    const target = join(basePath, dir);
    if (!existsSync(target)) {
      console.log(`[+] Creating data directory: ${target}`);
      mkdirSync(target, { recursive: true });
    }
  });
}

function setupAutoUpdateBranch() {
  console.log("[+] Setting up auto-update branch...");

  const currentBranch =
    runCommand("git branch --show-current", { quiet: true }) || "(detached)";
  console.log(`[+] Current branch: ${currentBranch}`);

  // pull latest code
  runCommand("git fetch --all --prune", { inherit: true });

  const branchExists = checkBranchExists("auto-update");

  if (!branchExists) {
    console.log(
      "[+] auto-update branch does not exist, creating orphan branch...",
    );

    withWorktree(
      "HEAD",
      (worktreePath) => {
        runCommand("git checkout --orphan auto-update", {
          cwd: worktreePath,
          inherit: true,
        });

        runCommand("git reset --hard", { cwd: worktreePath, inherit: true });
        runCommand("git clean -fd", { cwd: worktreePath, inherit: true });

        ensureDataDirectories(worktreePath);

        writeFileSync(
          join(worktreePath, "README.md"),
          `# BGP.Tools Auto-Update Branch

This branch only contains automatically updated data files.

Update time: \`${new Date().toISOString()}\`
`,
        );

        writeFileSync(
          join(worktreePath, ".gitignore"),
          `node_modules/
*.bin
`,
        );

        runCommand("git add README.md .gitignore table/ asns/ tags/", {
          cwd: worktreePath,
          inherit: true,
        });

        runCommand(
          `git commit -m "🚀 Initialize auto-update data branch at ${new Date().toISOString()}"`,
          {
            cwd: worktreePath,
            inherit: true,
          },
        );

        runCommand("git push -u origin auto-update", {
          cwd: worktreePath,
          inherit: true,
        });

        console.log("[+] auto-update branch created and pushed");
      },
      { detach: true, label: "auto-update-init" },
    );
  } else {
    console.log("[+] auto-update branch already exists");
  }

  console.log("[+] auto-update branch setup completed");
}

function main() {
  try {
    setupAutoUpdateBranch();
  } catch (error) {
    console.error("[-] Failed to setup auto-update branch:", error.message);
    console.error("💡 Tips: If the auto-update branch already exists remotely, please manually delete it or pull the latest commits and try again.");
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { setupAutoUpdateBranch };
