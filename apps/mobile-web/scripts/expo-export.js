/**
 * Wrapper around `expo export` that force-exits after completion.
 *
 * On CI (Vercel), Metro's file watcher or the Tamagui babel plugin can keep
 * the process alive indefinitely after bundling finishes. This uses piped
 * stdio to detect when Metro finishes writing output, then checks for the
 * output directory and exits — even if the child process itself hasn't quit.
 */
const { spawn } = require("child_process");
const { existsSync } = require("fs");
const { resolve } = require("path");

const OUTPUT_DIR = resolve(__dirname, "..", "dist");
let bundleComplete = false;

const child = spawn("npx", ["expo", "export", "--platform", "web", "--output-dir", "dist"], {
  stdio: ["inherit", "pipe", "pipe"],
  env: { ...process.env },
});

// Forward output to parent's stdio while monitoring for completion
child.stdout.on("data", (data) => {
  process.stdout.write(data);
  const text = data.toString();
  if (text.includes("Exported:") || text.includes("web bundles")) {
    bundleComplete = true;
  }
});

child.stderr.on("data", (data) => {
  process.stderr.write(data);
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  console.error("expo export failed to start:", err);
  process.exit(1);
});

// Check periodically: if bundling is done and output exists, force exit
const checker = setInterval(() => {
  if (bundleComplete && existsSync(resolve(OUTPUT_DIR, "index.html"))) {
    console.log("\nExport complete, forcing exit...");
    clearInterval(checker);
    child.kill("SIGTERM");
    // Give it 3s to exit gracefully, then force kill
    setTimeout(() => {
      child.kill("SIGKILL");
      process.exit(0);
    }, 3000);
  }
}, 2000);
checker.unref();

// Hard timeout: 10 minutes
const hardTimeout = setTimeout(
  () => {
    console.error("expo export timed out after 10 minutes");
    child.kill("SIGKILL");
    // If output exists, consider it a success
    process.exit(existsSync(resolve(OUTPUT_DIR, "index.html")) ? 0 : 1);
  },
  10 * 60 * 1000,
);
hardTimeout.unref();
