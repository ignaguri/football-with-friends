// scripts/check-app-versions.ts
//
// Drift detector: fails non-zero if app-versions.ts disagrees with
// app.config.ts. Run via `pnpm check:app-versions` and from the
// husky pre-commit hook.
//
// Escape hatch: set SKIP_VERSION_CHECK=1 (e.g., for PRs that bump
// app.config.ts before the new build is live on the store).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

if (process.env.SKIP_VERSION_CHECK === "1") {
  console.log("[check-app-versions] SKIP_VERSION_CHECK=1, skipping.");
  process.exit(0);
}

const ROOT = resolve(__dirname, "..");
const APP_CONFIG = resolve(ROOT, "apps/mobile-web/app.config.ts");
const APP_VERSIONS = resolve(ROOT, "apps/api/src/config/app-versions.ts");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function must(pattern: RegExp, source: string, label: string): string {
  const m = source.match(pattern);
  if (!m || !m[1]) {
    console.error(`[check-app-versions] could not find ${label}`);
    process.exit(2);
  }
  return m[1];
}

const configSrc = read(APP_CONFIG);
const versionsSrc = read(APP_VERSIONS);

const configVersion = must(/version:\s*"([^"]+)"/, configSrc, "app.config.ts version");
const configBuildNumber = must(/buildNumber:\s*"([^"]+)"/, configSrc, "app.config.ts ios.buildNumber");
const configVersionCode = must(/versionCode:\s*(\d+)/, configSrc, "app.config.ts android.versionCode");

const versionsIosVersion = must(/ios:\s*\{[^}]*version:\s*"([^"]+)"/s, versionsSrc, "app-versions.ts ios.version");
const versionsIosBuild = must(/ios:\s*\{[^}]*buildNumber:\s*(\d+)/s, versionsSrc, "app-versions.ts ios.buildNumber");
const versionsAndroidVersion = must(/android:\s*\{[^}]*version:\s*"([^"]+)"/s, versionsSrc, "app-versions.ts android.version");
const versionsAndroidCode = must(/android:\s*\{[^}]*versionCode:\s*(\d+)/s, versionsSrc, "app-versions.ts android.versionCode");

const errors: string[] = [];

if (configVersion !== versionsIosVersion) {
  errors.push(`ios.version mismatch: app.config.ts=${configVersion}, app-versions.ts=${versionsIosVersion}`);
}
if (configVersion !== versionsAndroidVersion) {
  errors.push(`android.version mismatch: app.config.ts=${configVersion}, app-versions.ts=${versionsAndroidVersion}`);
}
if (configBuildNumber !== versionsIosBuild) {
  errors.push(`ios.buildNumber mismatch: app.config.ts=${configBuildNumber}, app-versions.ts=${versionsIosBuild}`);
}
if (configVersionCode !== versionsAndroidCode) {
  errors.push(`android.versionCode mismatch: app.config.ts=${configVersionCode}, app-versions.ts=${versionsAndroidCode}`);
}

if (errors.length > 0) {
  console.error("[check-app-versions] DRIFT DETECTED:");
  for (const e of errors) console.error("  - " + e);
  console.error("");
  console.error("Bump apps/api/src/config/app-versions.ts to match apps/mobile-web/app.config.ts");
  console.error("(or set SKIP_VERSION_CHECK=1 if the new build is not yet live on the store).");
  process.exit(1);
}

console.log("[check-app-versions] OK");
