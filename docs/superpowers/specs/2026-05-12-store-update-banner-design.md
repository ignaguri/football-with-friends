# Store Update Banner — Design

**Status:** Approved 2026-05-12
**Owner:** ignacioguri
**Related:** OTA update dialog in `apps/mobile-web/app/_layout.tsx:184-221`

## Problem

The app currently surfaces **OTA** updates via an `AlertDialog` with a restart button (`apps/mobile-web/app/_layout.tsx`). There is no equivalent surface for **native store** updates — when a new build ships to the App Store (iOS, production) or the Play Store (Android, currently closed test), users on older binaries have no in-app signal. We want a dismissible banner that tells them a new version is available and deep-links to the appropriate store.

## Goals

- Native-only banner that appears when a newer store version exists.
- Works for **iOS App Store** (production) and **Android Play Store closed/alpha track** (current state) without depending on the public web Play listing.
- Soft, dismissible UX. No force-update.
- One ops cost per release: bump a single constants file.

## Non-goals

- Hard/blocking force-update flow. (May be added later as a second tier; out of scope here.)
- Force-update / minimum-required-version logic.
- Automated detection via store APIs (iTunes Lookup or Google Play Developer API).
- Showing the banner on web. PWA auto-reloads to the latest deploy; nothing to surface.
- Coordinating with the OTA dialog. The two are independent; if both fire, OTA's modal sits over the banner, which is acceptable.
- Automated tests for this feature. Manual QA only.

## Architecture

Single endpoint, single source of truth, integer-based comparison.

1. **Server** exposes `GET /api/app-version` returning the latest *released* native build per platform from a hand-edited TypeScript constants file. No DB, no service accounts, no external API calls. Response is cacheable for 5 minutes.
2. **Client** (native only) fetches the endpoint on launch and on app-foreground-after-long-idle (>6h), compares its local `buildNumber` / `versionCode` against the server's, and renders a banner if the server's number is strictly greater. Dismissal is persisted per server-version so the banner stays hidden until the next release.

### Data shape

```json
{
  "ios":     { "version": "1.3.7", "buildNumber": 29,
                "storeUrl": "https://apps.apple.com/us/app/fulbo-with-friends/id6759833737" },
  "android": { "version": "1.3.7", "versionCode": 15,
                "storeUrl": "https://play.google.com/store/apps/details?id=com.pepegrillo.footballwithfriends" }
}
```

The server returns this verbatim. The client picks the field for its platform and compares the integer counter.

### Comparison strategy

We compare the **explicit integer build counters** (`buildNumber` on iOS, `versionCode` on Android), not the semver string. This sidesteps "1.3.10 < 1.3.2" lexicographic pitfalls and matches how the stores themselves order builds.

The user-facing label uses the semver `version` field (e.g. "1.3.8") for readability.

## Components

### Server (`apps/api`)

- **`apps/api/src/config/app-versions.ts`** — constants module exporting `APP_VERSIONS`. Hand-edited as part of every store-bound release PR (see Release Workflow below). Includes the `storeUrl` for each platform so the client never hardcodes IDs.
- **`apps/api/src/routes/app-version.ts`** — Hono route mounted at `GET /api/app-version`. Returns `APP_VERSIONS` verbatim with `Cache-Control: public, max-age=300`.
- **`apps/api/src/middleware/security.ts`** — add `/api/app-version` to the public allowlist (no auth, no group scope).

### Client (`apps/mobile-web`)

- **`apps/mobile-web/lib/store-update/use-store-update.ts`** — hook owning the check. Returns `{ available, latestVersion, storeUrl, dismiss }`.
  - Reads local build counter via `expo-application` (`Application.nativeBuildVersion`).
  - Reads dismissed version from `AsyncStorage` under key `store-update:dismissed-version`.
  - Fetches `/api/app-version` on mount, and re-fetches on `AppState` change to `active` when last-check was >6h ago.
  - Strict-greater-than comparison: server counter > local counter AND dismissed-version ≠ server-version → `available: true`.
  - `dismiss()` persists the server's semver string so the same release stays hidden until the next bump.
  - No-op on web (`Platform.OS === "web"`) and in dev (`__DEV__`).

- **`apps/mobile-web/components/store-update-banner.tsx`** — Tamagui `XStack` banner: up-arrow icon, label, "Update" button, dismiss "×". On press, `Linking.openURL(storeUrl)`. Hides itself when `available` is false.

- **i18n** — strings added to `locales/en/common.json` and `locales/es/common.json` under a new `storeUpdate.*` namespace:
  - `storeUpdate.available` ("New version available")
  - `storeUpdate.update` ("Update")
  - `storeUpdate.dismiss` (a11y label for ×)

- **Mount point** — inside `apps/mobile-web/app/(tabs)/_layout.tsx` at the top of the screen stack, above tab content. Not in root `_layout.tsx` — that would surface it on auth/onboarding screens where it's the wrong context.

### Drift check

- **`scripts/check-app-versions.ts`** — Node script (run via `tsx`) that reads `apps/mobile-web/app.config.ts` and `apps/api/src/config/app-versions.ts`, asserts `ios.buildNumber` and `android.versionCode` match, and asserts the semver `version` matches. Fails non-zero on drift.
- Exposed as `pnpm check:app-versions`. Invoked from `.husky/pre-commit` (the repo has no GitHub Actions today; if CI is added later, the same script plugs in).
- **Escape hatch:** set the env var `SKIP_VERSION_CHECK=1` to bypass — e.g. `SKIP_VERSION_CHECK=1 git commit -m "..."`. Used during the release PR that bumps `app.config.ts` before the new build is live on the store.

## Data flow

```
launch / foreground-after-6h
        │
        ▼
   useStoreUpdate hook
        │
        ├── read Application.nativeBuildVersion  ◄─── expo-application
        ├── read AsyncStorage["store-update:dismissed-version"]
        ├── fetch GET /api/app-version
        │       │
        │       ▼
        │   apps/api/src/routes/app-version.ts
        │       │
        │       ▼
        │   apps/api/src/config/app-versions.ts  (constants)
        │
        ▼
   compare: server.counter > local.counter
            && dismissed !== server.version
        │
        ▼
   available: true ──► <StoreUpdateBanner />
                              │
                       ┌──────┴──────┐
                   Update           ×
                   Linking.openURL  dismiss() →
                   (storeUrl)       AsyncStorage write
```

## Error handling & edge cases

- **Fetch failure** (network down, Worker 500, JSON parse error): silent fail. `available` stays false. Same philosophy as the OTA check (`apps/mobile-web/app/_layout.tsx:217`).
- **Server returns same-or-lower version than local** (e.g., user on a TestFlight build ahead of prod): `available: false`. Strict-greater handles this naturally.
- **`Application.nativeBuildVersion` is null** (web/dev): bail out, no banner.
- **AsyncStorage read fails / value corrupted**: treat as "not dismissed". Worst case the user dismisses again; don't crash.
- **AppState rapid toggling during cold launch**: debounce — only re-check on `active` if `lastChecked` is older than 6h.
- **OTA dialog + banner both eligible at once**: independent surfaces. OTA's modal will sit over the banner. Restart via OTA reloads JS and store check runs again. No coordination logic.
- **Apple is mid-review** when constants are bumped: users on older versions still see the banner. Tapping Update sends them to the store where they'll see the previous version. Mitigation: only bump `app-versions.ts` once the binary is live on the store (it's a separate, fast PR after the release one). Document this in the release checklist.

## Release workflow

Two-step, intentionally manual:

1. **Release PR** — bumps `apps/mobile-web/app.config.ts` (`version`, `buildNumber`, `versionCode`), runs EAS Build & Submit. Commit with `SKIP_VERSION_CHECK=1` to bypass the pre-commit drift check (since `app-versions.ts` is intentionally not bumped yet).
2. **Banner-enable PR:** once the build is live on the App Store / Play Store closed track, a tiny follow-up PR bumps `app-versions.ts` to match. This is the moment existing users start seeing the banner.

Document both steps in `docs/deployment.md`.

## Manual QA

- Bump server constants on staging above local build → relaunch app → banner appears.
- Tap "Update" → store opens to the correct app.
- Tap "×" → banner disappears.
- Relaunch app → banner stays hidden.
- Bump server constants again → relaunch → banner reappears.
- Verify web build shows no banner.
- Verify dev build (`__DEV__`) shows no banner.

## Out of scope (future work)

- Force-update tier: add `min{Ios,Android}BuildNumber` to the same endpoint, render a blocking dialog when local < min. Endpoint shape is forward-compatible.
- Automated detection via iTunes Lookup / Play Developer API. Revisit if manual bump becomes a chore or causes drift incidents.
- Sharing the OTA + store-update UI into a single "update center" surface. Premature today.
