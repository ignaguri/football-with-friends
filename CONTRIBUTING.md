# Contributing

Welcome. This is a Turborepo + pnpm monorepo. Start with [`CLAUDE.md`](./CLAUDE.md) for the full architecture overview (apps, packages, auth, groups, notifications); this file covers the day-to-day workflow and a few gotchas that aren't obvious from the code.

## Prerequisites

- **Node** + **pnpm** (`pnpm@9.15.0`, pinned via `packageManager` in `package.json`)
- **Bun** for running the API locally
- An `.env` set up from `.env.example`. Run `pnpm validate-env` to check required variables.

## Getting started

```bash
pnpm install          # installs all workspaces
pnpm dev              # runs API + mobile-web together (Turborepo)
# or individually:
pnpm dev:api          # Hono API (Bun) on :3001
pnpm dev:app          # Expo app (web on :8084, plus iOS/Android)
```

## Before you push

Run the project's own checks. Pushing red code wastes CI and review cycles.

```bash
pnpm typecheck        # type-checks all packages and apps
pnpm lint             # oxlint (fix errors, not just warnings)
pnpm build            # catches issues typecheck alone misses
```

Run the relevant tests too (API tests live under `apps/api/src/test`).

> **Note:** TypeScript checking is intentionally disabled for `apps/mobile-web` due to Tamagui type-recursion issues, so `pnpm typecheck` will not catch type errors in that app. Rely on the build and manual testing there.

## Commits and PRs

- **Conventional Commits**: `feat(scope): …`, `fix(scope): …`, `chore(deps): …`. See recent history for the style.
- Work on a branch and open a PR against `main`; don't commit directly to `main`.
- Web deploys to Vercel automatically from `main`; the API deploys to Cloudflare Workers via `pnpm cf:deploy` from `apps/api`. See [`docs/deployment.md`](./docs/deployment.md).

## Mobile builds — read before touching EAS

**Cloud EAS builds cost real credits and the project has a limited free allowance.** Do not run `eas build` (cloud) or `eas submit` without the maintainer's explicit approval. For local iteration use the free paths: `expo run:ios` / `expo run:android`, or `eas build --local`.

**Rename `apps/mobile-web/.env.local` before `eas build --local` or `eas update`.** The Metro bundler picks it up over EAS profile env vars and bakes dev URLs (e.g. `localhost:3001`) into the binary or OTA bundle. Full steps: [`docs/deployment.md`](./docs/deployment.md) → "EAS Local Builds".

## Database migrations

Kysely + Turso (LibSQL). Create and run migrations via the root scripts (`pnpm migrate`, `pnpm migrate:up`, `pnpm migrate-remote`, …). See [`docs/migration-guide.md`](./docs/migration-guide.md) for the workflow and [`docs/deployment-checklist.md`](./docs/deployment-checklist.md) before applying to production.

## Docs map

- Current architecture and conventions: [`CLAUDE.md`](./CLAUDE.md)
- Live topic docs: [`docs/`](./docs/) — groups, notifications, configuration, deployment, phone auth, accessibility, migrations
- Historical planning/migration docs (do **not** treat as current): [`docs/archive/`](./docs/archive/)

A couple of things worth knowing that trip people up:

- The API uses **Hono RPC**, not oRPC. Add new endpoints as Hono routes under `apps/api/src/routes/*` and register them in `apps/api/src/api-routes.ts`. There is no oRPC client.
- Storage is **Turso/LibSQL** (`STORAGE_PROVIDER` is `turso` or `local-db`). The project used Google Sheets in an earlier life; ignore any doc that says otherwise.
