/**
 * Wrapper around `expo export` that force-exits after completion.
 *
 * On CI (Vercel), Metro's file watcher or the Tamagui babel plugin can keep
 * the process alive indefinitely after bundling finishes. This script spawns
 * expo export as a child process and force-kills it once stdio closes.
 */
const { spawn } = require("child_process");

const child = spawn(
  "npx",
  ["expo", "export", "--platform", "web", "--output-dir", "dist"],
  { stdio: "inherit", env: { ...process.env } }
);

child.on("close", (code) => {
  // Force-exit the parent immediately — don't let dangling handles block
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  console.error("expo export failed to start:", err);
  process.exit(1);
});

// Safety net: if the child hasn't closed after 10 minutes, kill it
const TIMEOUT_MS = 10 * 60 * 1000;
const timer = setTimeout(() => {
  console.error("expo export timed out after 10 minutes, killing...");
  child.kill("SIGKILL");
  process.exit(1);
}, TIMEOUT_MS);
timer.unref(); // Don't let the timer itself keep the process alive
