import { execSync } from "child_process";

export function runCommand(command) {
  try {
    console.log(`[+] Running command: ${command}`);
    const result = execSync(command, { encoding: "utf8", stdio: "pipe" });
    return result.trim();
  } catch (error) {
    console.error(`[!] Command failed: ${command}`);
    console.error(error.message);
    throw error;
  }
}
