import { execSync } from "child_process";

export function runCommand(command, options = {}) {
  const { cwd, silent = false, ignoreError = false } = options;

  try {
    console.log(`[+] Running command: ${command}`);
    const result = execSync(command, {
      encoding: "utf8",
      stdio: silent ? "pipe" : "inherit",
      cwd,
    });
    return result ? result.trim() : "";
  } catch (error) {
    if (ignoreError) {
      console.warn(`[!] Command failed (ignored): ${command}`);
      return "";
    }

    console.error(`[!] Command failed: ${command}`);
    console.error(error.message);
    throw error;
  }
}
