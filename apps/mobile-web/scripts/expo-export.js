/**
 * Wrapper around `expo export` that force-exits after completion.
 *
 * On CI (Vercel), Metro's file watcher or the Tamagui babel plugin can keep
 * the process alive indefinitely after bundling finishes. This script spawns
 * `expo export` as a child process and calls process.exit() once it completes.
 */
const { spawn } = require("child_process");

const args = ["export", "--platform", "web", "--output-dir", "dist"];

const child = spawn("npx", ["expo", ...args], {
  stdio: "inherit",
  env: { ...process.env },
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  console.error("Failed to start expo export:", err);
  process.exit(1);
});
