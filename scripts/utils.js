import { execSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export function runCommand(command, options = {}) {
  const { cwd, inherit = false, allowFailure = false, quiet = false } = options;

  const stdio = inherit ? "inherit" : "pipe";

  if (!quiet) {
    console.log(`[cmd] ${command}`);
  }

  try {
    const output = execSync(command, {
      encoding: "utf8",
      cwd,
      stdio,
    });

    return inherit ? "" : output.trim();
  } catch (error) {
    if (allowFailure) {
      if (!quiet) {
        console.warn(`[warn] ${command} failed but was allowed to continue`);
      }
      return "";
    }

    const stderr = error.stderr?.toString().trim();
    const stdout = error.stdout?.toString().trim();
    const reason = stderr || stdout || error.message;

    throw new Error(`${command} failed: ${reason}`);
  }
}

function createTempWorktreePath(label = "worktree") {
  const normalized = label.replace(/[^a-zA-Z0-9_-]/g, "-");
  return mkdtempSync(join(tmpdir(), `bgp-opendb-${normalized}-`));
}

export function withWorktree(ref, callback, options = {}) {
  const { detach = false, force = false, label = "worktree" } = options;
  const worktreePath = createTempWorktreePath(label);

  const args = ["git", "worktree", "add"];
  if (force) args.push("--force");
  if (detach) args.push("--detach");
  args.push(worktreePath);
  if (!detach) {
    args.push(ref);
  }

  runCommand(args.join(" "), { inherit: true });

  try {
    return callback(worktreePath);
  } finally {
    runCommand(`git worktree remove ${worktreePath} --force`, {
      inherit: true,
      allowFailure: true,
      quiet: true,
    });
    rmSync(worktreePath, { recursive: true, force: true });
  }
}
