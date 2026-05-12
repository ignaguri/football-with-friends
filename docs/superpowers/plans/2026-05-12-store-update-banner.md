# Store Update Banner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a dismissible "new version available" banner on native (iOS + Android) when a manually-bumped server-side version constant advances past the local build counter, deep-linking to the App Store / Play Store.

**Architecture:** New public `GET /api/app-version` endpoint reads from a hand-edited TypeScript constants file. Client hook compares local `Application.nativeBuildVersion` to the server response on launch and on foreground-after-6h, persists per-version dismissal in `AsyncStorage`. A pre-commit hook (`pnpm check:app-versions`) fails when `apps/mobile-web/app.config.ts` and `apps/api/src/config/app-versions.ts` drift.

**Tech Stack:** Hono (API), Expo + React Native + Tamagui (mobile), `expo-application`, `@react-native-async-storage/async-storage`, husky.

**Spec:** [`docs/superpowers/specs/2026-05-12-store-update-banner-design.md`](../specs/2026-05-12-store-update-banner-design.md)

---

## File map

**Create:**
- `apps/api/src/config/app-versions.ts` — single source of truth for latest released versions
- `apps/api/src/routes/app-version.ts` — Hono route exposing the constants
- `apps/mobile-web/lib/store-update/use-store-update.ts` — client hook
- `apps/mobile-web/components/store-update-banner.tsx` — banner component
- `scripts/check-app-versions.ts` — drift detector

**Modify:**
- `apps/api/src/api-routes.ts` — register route
- `apps/api/src/middleware/security.ts` — add to public allowlist
- `apps/mobile-web/app/(tabs)/_layout.tsx` — mount banner
- `locales/en/common.json`, `locales/es/common.json` — i18n strings
- `package.json` (root) — add `check:app-versions` script
- `.husky/pre-commit` — enable hook to call the script

---

## Task 1: Server constants module

**Files:**
- Create: `apps/api/src/config/app-versions.ts`

- [ ] **Step 1: Create the constants file**

```ts
// apps/api/src/config/app-versions.ts
//
// Latest released store versions for the mobile app.
//
// IMPORTANT: bump these when (and only when) a new build is LIVE on the
// App Store / Play Store track. The values here drive the in-app
// "new version available" banner. The pre-commit hook
// `pnpm check:app-versions` enforces that these stay in sync with
// `apps/mobile-web/app.config.ts`.
export const APP_VERSIONS = {
  ios: {
    version: "1.3.7",
    buildNumber: 29,
    storeUrl: "https://apps.apple.com/us/app/fulbo-with-friends/id6759833737",
  },
  android: {
    version: "1.3.7",
    versionCode: 15,
    storeUrl:
      "https://play.google.com/store/apps/details?id=com.pepegrillo.footballwithfriends",
  },
} as const;

export type AppVersions = typeof APP_VERSIONS;
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/config/app-versions.ts
git commit -m "feat(api): add app-versions constants module"
```

---

## Task 2: Server route

**Files:**
- Create: `apps/api/src/routes/app-version.ts`

- [ ] **Step 1: Create the route**

```ts
// apps/api/src/routes/app-version.ts
import { Hono } from "hono";
import { APP_VERSIONS } from "../config/app-versions";
import { type AppVariables } from "../middleware/security";

const app = new Hono<{ Variables: AppVariables }>();

// Public, unauthenticated. Allowlisted in middleware/security.ts.
// Cached at the edge for 5 minutes; constants only change on deploy.
app.get("/", (c) => {
  c.header("Cache-Control", "public, max-age=300");
  return c.json(APP_VERSIONS);
});

export default app;
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/routes/app-version.ts
git commit -m "feat(api): add GET /api/app-version route"
```

---

## Task 3: Register route and allowlist

**Files:**
- Modify: `apps/api/src/api-routes.ts`
- Modify: `apps/api/src/middleware/security.ts`

- [ ] **Step 1: Import and register the route**

In `apps/api/src/api-routes.ts`, add the import alongside the others:

```ts
import appVersionRoute from "./routes/app-version";
```

And add the route registration (insert near the other public-ish routes, e.g., after `ogRoute`):

```ts
    .route("/og", ogRoute)
    .route("/app-version", appVersionRoute);
```

- [ ] **Step 2: Add to public allowlist**

In `apps/api/src/middleware/security.ts`, add an entry to `PUBLIC_ROUTES` (insert after the `/health` entry):

```ts
  { path: /^\/health$/ }, // Health check
  { path: /^\/api\/app-version$/, method: "GET" }, // Public store-version probe
```

- [ ] **Step 3: Start the API locally and probe the endpoint**

Run in one terminal: `pnpm dev:api`

Run in another:
```bash
curl -sS http://localhost:3001/api/app-version | jq .
```

Expected:
```json
{
  "ios":     { "version": "1.3.7", "buildNumber": 29,  "storeUrl": "https://apps.apple.com/us/app/fulbo-with-friends/id6759833737" },
  "android": { "version": "1.3.7", "versionCode": 15,  "storeUrl": "https://play.google.com/store/apps/details?id=com.pepegrillo.footballwithfriends" }
}
```

Also check the cache header is present:
```bash
curl -sSI http://localhost:3001/api/app-version | grep -i cache-control
# cache-control: public, max-age=300
```

- [ ] **Step 4: Verify the endpoint requires no auth**

The above curls should return 200 without any auth headers. If you get a 401, the allowlist entry isn't matching — re-check the regex.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/api-routes.ts apps/api/src/middleware/security.ts
git commit -m "feat(api): register app-version route and allowlist it as public"
```

---

## Task 4: i18n strings

**Files:**
- Modify: `locales/en/common.json`
- Modify: `locales/es/common.json`

- [ ] **Step 1: Add English strings**

In `locales/en/common.json`, add a `storeUpdate` block at the same indentation level as other top-level namespaces (e.g., next to `updates`):

```json
  "storeUpdate": {
    "available": "New version available",
    "update": "Update",
    "dismiss": "Dismiss update banner"
  },
```

- [ ] **Step 2: Add Spanish strings**

In `locales/es/common.json`:

```json
  "storeUpdate": {
    "available": "Hay una nueva versión disponible",
    "update": "Actualizar",
    "dismiss": "Cerrar aviso de actualización"
  },
```

- [ ] **Step 3: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('locales/en/common.json'))"
node -e "JSON.parse(require('fs').readFileSync('locales/es/common.json'))"
```

Both should exit silently. If you see a `SyntaxError`, fix the trailing comma you forgot.

- [ ] **Step 4: Commit**

```bash
git add locales/en/common.json locales/es/common.json
git commit -m "feat(i18n): add storeUpdate strings"
```

---

## Task 5: Client hook

**Files:**
- Create: `apps/mobile-web/lib/store-update/use-store-update.ts`

- [ ] **Step 1: Create the hook**

```ts
// apps/mobile-web/lib/store-update/use-store-update.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DISMISSED_KEY = "store-update:dismissed-version";
const FOREGROUND_RECHECK_MS = 6 * 60 * 60 * 1000; // 6h

type ServerResponse = {
  ios: { version: string; buildNumber: number; storeUrl: string };
  android: { version: string; versionCode: number; storeUrl: string };
};

type State = {
  available: boolean;
  latestVersion: string | null;
  storeUrl: string | null;
};

const INITIAL: State = { available: false, latestVersion: null, storeUrl: null };

function pickPlatform(payload: ServerResponse) {
  if (Platform.OS === "ios") {
    return { latestCounter: payload.ios.buildNumber, version: payload.ios.version, storeUrl: payload.ios.storeUrl };
  }
  if (Platform.OS === "android") {
    return { latestCounter: payload.android.versionCode, version: payload.android.version, storeUrl: payload.android.storeUrl };
  }
  return null;
}

export function useStoreUpdate(apiUrl: string | undefined) {
  const [state, setState] = useState<State>(INITIAL);
  const lastCheckedRef = useRef<number>(0);

  const check = useCallback(async () => {
    // Native + non-dev only. Web auto-updates; dev is too noisy.
    if (Platform.OS === "web" || __DEV__) return;
    if (!apiUrl) return;

    try {
      const localBuildRaw = Application.nativeBuildVersion;
      if (!localBuildRaw) return;
      const localCounter = Number.parseInt(localBuildRaw, 10);
      if (!Number.isFinite(localCounter)) return;

      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/api/app-version`);
      if (!res.ok) return;
      const payload = (await res.json()) as ServerResponse;
      const picked = pickPlatform(payload);
      if (!picked) return;

      lastCheckedRef.current = Date.now();

      if (picked.latestCounter <= localCounter) {
        setState({ available: false, latestVersion: picked.version, storeUrl: picked.storeUrl });
        return;
      }

      let dismissedVersion: string | null = null;
      try {
        dismissedVersion = await AsyncStorage.getItem(DISMISSED_KEY);
      } catch {
        // Treat unreadable storage as "not dismissed".
      }

      const available = dismissedVersion !== picked.version;
      setState({ available, latestVersion: picked.version, storeUrl: picked.storeUrl });
    } catch {
      // Silent fail — best-effort, same philosophy as the OTA check.
    }
  }, [apiUrl]);

  // Initial check on mount.
  useEffect(() => {
    void check();
  }, [check]);

  // Re-check when app returns to foreground after long idle.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      if (Date.now() - lastCheckedRef.current < FOREGROUND_RECHECK_MS) return;
      void check();
    });
    return () => sub.remove();
  }, [check]);

  const dismiss = useCallback(async () => {
    if (!state.latestVersion) return;
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, state.latestVersion);
    } catch {
      // Best-effort: even if write fails, hide for this session.
    }
    setState((prev) => ({ ...prev, available: false }));
  }, [state.latestVersion]);

  return { ...state, dismiss };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile-web/lib/store-update/use-store-update.ts
git commit -m "feat(mobile): add useStoreUpdate hook"
```

---

## Task 6: Banner component

**Files:**
- Create: `apps/mobile-web/components/store-update-banner.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/mobile-web/components/store-update-banner.tsx
// @ts-nocheck — Tamagui type recursion workaround (matches sibling components)
import { ArrowUpCircle, X } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Linking, Platform } from "react-native";
import { Button, Text, XStack } from "tamagui";

import { useStoreUpdate } from "../lib/store-update/use-store-update";

export function StoreUpdateBanner() {
  const { t } = useTranslation();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const { available, storeUrl, dismiss } = useStoreUpdate(apiUrl);

  if (Platform.OS === "web") return null;
  if (!available || !storeUrl) return null;

  return (
    <XStack
      backgroundColor="$blue3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      paddingHorizontal="$3"
      paddingVertical="$2"
      alignItems="center"
      gap="$2"
      testID="store-update-banner"
    >
      <ArrowUpCircle size={18} color="$blue11" />
      <Text flex={1} color="$blue12" fontSize="$3">
        {t("storeUpdate.available")}
      </Text>
      <Button
        size="$2"
        theme="blue"
        onPress={() => {
          void Linking.openURL(storeUrl);
        }}
        testID="store-update-banner-update"
        accessibilityRole="button"
      >
        {t("storeUpdate.update")}
      </Button>
      <Button
        size="$2"
        chromeless
        circular
        icon={X}
        onPress={() => {
          void dismiss();
        }}
        testID="store-update-banner-dismiss"
        accessibilityRole="button"
        accessibilityLabel={t("storeUpdate.dismiss")}
      />
    </XStack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile-web/components/store-update-banner.tsx
git commit -m "feat(mobile): add StoreUpdateBanner component"
```

---

## Task 7: Mount banner in tabs layout

**Files:**
- Modify: `apps/mobile-web/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add the import**

Near the other component imports at the top of `apps/mobile-web/app/(tabs)/_layout.tsx`, add:

```ts
import { StoreUpdateBanner } from "../../components/store-update-banner";
```

- [ ] **Step 2: Render the banner above `<GroupSwitcher />`**

Find the existing block:

```tsx
      <YStack flex={1}>
        <GroupSwitcher />
```

Change it to:

```tsx
      <YStack flex={1}>
        <StoreUpdateBanner />
        <GroupSwitcher />
```

The banner renders above the group switcher and above the tabs, so it sits at the very top of every tab screen but only after the user is authenticated and inside a group. Web is a no-op (handled inside the component), so this is safe to render unconditionally.

- [ ] **Step 3: Manual smoke test (banner hidden path)**

Run the app: `pnpm dev:app`

With current constants (server says 29 / 15, your local build will be the same), open the app on iOS Simulator or an Android emulator. The banner should NOT appear. Open the web build — the banner should also not appear. (In `__DEV__` the hook short-circuits anyway, so the simplest way to test in step 4 is to bump constants AND temporarily remove the `__DEV__` guard — or better, build a preview EAS build. Step 4 below covers the visible-path verification properly.)

- [ ] **Step 4: Manual smoke test (banner visible path)**

To actually see the banner without a release, temporarily edit `apps/api/src/config/app-versions.ts` and bump `ios.buildNumber` to `999` and `android.versionCode` to `999`. Then either:

- Build a non-dev EAS preview: `eas build --profile preview --platform ios` (or android), install it, and launch.
- OR temporarily remove the `if (__DEV__) return;` guard in `use-store-update.ts` and run `pnpm dev:app`. Banner should appear above the tabs.

Confirm:
- Banner is visible at the top.
- Tapping "Update" opens the App Store / Play Store deep link.
- Tapping "×" hides the banner.
- Killing and relaunching the app: banner stays hidden.
- Bumping the constants again (e.g., to `1000`): banner reappears on relaunch.

**REVERT** the constants and any guard changes before committing.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile-web/app/(tabs)/_layout.tsx
git commit -m "feat(mobile): mount StoreUpdateBanner in tabs layout"
```

---

## Task 8: Version-sync drift script

**Files:**
- Create: `scripts/check-app-versions.ts`

- [ ] **Step 1: Create the script**

```ts
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
```

- [ ] **Step 2: Test happy path (no drift)**

```bash
pnpm tsx scripts/check-app-versions.ts
```

Expected output: `[check-app-versions] OK` and exit code 0.

- [ ] **Step 3: Test drift detection**

Temporarily edit `apps/api/src/config/app-versions.ts` and change `ios.buildNumber` from `29` to `30`. Then:

```bash
pnpm tsx scripts/check-app-versions.ts
```

Expected: exit code 1 with `ios.buildNumber mismatch: app.config.ts=29, app-versions.ts=30`.

**Revert** the change.

- [ ] **Step 4: Test escape hatch**

With the same drift in place:

```bash
SKIP_VERSION_CHECK=1 pnpm tsx scripts/check-app-versions.ts
```

Expected: `[check-app-versions] SKIP_VERSION_CHECK=1, skipping.` and exit code 0.

**Revert** the constants again.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-app-versions.ts
git commit -m "chore: add app-versions drift check script"
```

---

## Task 9: Wire script into root scripts and pre-commit

**Files:**
- Modify: `package.json` (root)
- Modify: `.husky/pre-commit`

- [ ] **Step 1: Add the npm script**

In root `package.json`, add inside `"scripts"` (anywhere; alphabetical-ish neighbor is `validate-env`):

```json
    "check:app-versions": "tsx scripts/check-app-versions.ts",
```

- [ ] **Step 2: Enable the husky hook**

Replace the contents of `.husky/pre-commit` with:

```sh
# Fail the commit if apps/api/src/config/app-versions.ts disagrees with
# apps/mobile-web/app.config.ts. Set SKIP_VERSION_CHECK=1 to bypass
# (e.g., when bumping app.config.ts before the new build is live on the store).
pnpm check:app-versions
```

(The previous file's only line was a commented-out `lint-staged` invocation — leaving lint-staged disabled, since that's how the repo was before.)

- [ ] **Step 3: Verify the hook fires**

```bash
# Sanity: script runs via pnpm alias
pnpm check:app-versions
# → [check-app-versions] OK
```

Now simulate a commit with drift:

```bash
# Introduce drift
sed -i.bak 's/buildNumber: 29/buildNumber: 30/' apps/api/src/config/app-versions.ts
rm apps/api/src/config/app-versions.ts.bak

# Stage and attempt to commit
git add apps/api/src/config/app-versions.ts
git commit -m "test: should be blocked"
```

Expected: the commit fails with the drift error.

Cleanup:
```bash
git restore --staged apps/api/src/config/app-versions.ts
git checkout -- apps/api/src/config/app-versions.ts
```

- [ ] **Step 4: Verify escape hatch works in pre-commit**

Reintroduce drift the same way, then:

```bash
git add apps/api/src/config/app-versions.ts
SKIP_VERSION_CHECK=1 git commit -m "test: should pass with skip"
```

Expected: commit succeeds. Then undo it:

```bash
git reset --soft HEAD~1
git restore --staged apps/api/src/config/app-versions.ts
git checkout -- apps/api/src/config/app-versions.ts
```

- [ ] **Step 5: Commit the wiring**

```bash
git add package.json .husky/pre-commit
git commit -m "chore(husky): run app-versions drift check on pre-commit"
```

---

## Task 10: Document the release workflow

**Files:**
- Modify: `docs/deployment.md`

- [ ] **Step 1: Append the release-workflow note**

At the bottom of `docs/deployment.md`, append a new section:

```markdown
## Native releases and the in-app update banner

The mobile app shows a "new version available" banner whenever the values in `apps/api/src/config/app-versions.ts` advance past the user's local build counter. To avoid sending users to a store listing that hasn't been updated yet, follow this two-step flow:

1. **Release PR**: bump `apps/mobile-web/app.config.ts` (`version`, `ios.buildNumber`, `android.versionCode`). Commit with `SKIP_VERSION_CHECK=1` to bypass the pre-commit drift check. Build and submit via EAS as usual.
2. **Banner-enable PR**: once the new build is live on the App Store / Play Store closed track, open a tiny follow-up PR that bumps `apps/api/src/config/app-versions.ts` to match. Merging this deploys the API and existing users on older builds start seeing the banner.

To bypass the drift check ad-hoc (e.g. during step 1):

```sh
SKIP_VERSION_CHECK=1 git commit -m "release: bump to 1.4.0"
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/deployment.md
git commit -m "docs: document store-update banner release workflow"
```

---

## Final verification

- [ ] **Step 1: Typecheck**

```bash
pnpm typecheck
```

Expected: clean. (`apps/mobile-web` is `@ts-nocheck` in many files; the new component uses the same opt-out. The hook and server route are typed.)

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Expected: no new findings.

- [ ] **Step 3: API smoke**

```bash
pnpm dev:api
# in another terminal:
curl -sS http://localhost:3001/api/app-version | jq .
```

Expected: 200 with the constants JSON.

- [ ] **Step 4: Mobile smoke**

Run `pnpm dev:app` and load the app on iOS Simulator (or Android emulator) signed in to a test account. Verify:
- Banner is NOT visible (server version equals local).
- Web app is unaffected.

For the visible-path verification, see Task 7 Step 4.
