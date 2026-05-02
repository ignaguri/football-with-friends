# Deployment Architecture

The application uses a split deployment architecture.

## Expo Web App — Vercel

- Deployed as static SPA from `apps/mobile-web/dist`
- Configured via `vercel.json` in root
- Auto-deploys on push to main branch
- Set `EXPO_PUBLIC_API_URL` in Vercel to point to the Cloudflare Workers API

**Vercel Environment Variables**:

- Production: `EXPO_PUBLIC_API_URL=https://football-api.pepe-grillo-parlante.workers.dev`
- Preview: `EXPO_PUBLIC_API_URL=https://football-api-staging.pepe-grillo-parlante.workers.dev`

## Hono API — Cloudflare Workers

- Deployed via `wrangler` from `apps/api`
- Configuration in `apps/api/wrangler.toml`

| Environment | URL                                                             | Database                                   |
| ----------- | --------------------------------------------------------------- | ------------------------------------------ |
| Production  | `https://football-api.pepe-grillo-parlante.workers.dev`         | `football-with-friends-pepegrillo`         |
| Staging     | `https://football-api-staging.pepe-grillo-parlante.workers.dev` | `football-with-friends-staging-pepegrillo` |

**Deploy commands** (from `apps/api`):

```bash
pnpm cf:deploy           # Deploy to production
pnpm cf:deploy:preview   # Deploy to staging
pnpm cf:tail             # View production logs
pnpm cf:tail --env=preview  # View staging logs
```

## EAS Local Builds (iOS / Android) and OTA Updates

Use `eas build --local` to produce a local `.ipa` or `.apk` without uploading source to EAS servers. Use `eas update` to push OTA JavaScript bundle updates.

**⚠️ Rename `.env.local` before building or sending an OTA update.** The Expo Metro bundler loads `apps/mobile-web/.env.local` during the bundle phase even when EAS injects profile env vars — local values (e.g. `EXPO_PUBLIC_API_URL=http://localhost:3001`) silently win and get baked into the binary or OTA bundle.

```bash
# Before building or running eas update
mv apps/mobile-web/.env.local apps/mobile-web/.env.local.bak

eas build --local --profile production-apk  # or whichever profile
# or
eas update --branch production --message "..."

# After
mv apps/mobile-web/.env.local.bak apps/mobile-web/.env.local
```

Restore the file after the command completes. Skipping this step is how `localhost` URLs end up in production binaries or OTA bundles.

## Required Cloudflare Secrets

Set for both production and staging environments:

```bash
# Production
wrangler secret put TURSO_DATABASE_URL --env=""
wrangler secret put TURSO_AUTH_TOKEN --env=""
wrangler secret put BETTER_AUTH_SECRET --env=""
wrangler secret put NEXT_PUBLIC_GOOGLE_CLIENT_ID --env=""
wrangler secret put GOOGLE_CLIENT_SECRET --env=""

# Staging (use staging Turso DB credentials)
wrangler secret put TURSO_DATABASE_URL --env=preview
wrangler secret put TURSO_AUTH_TOKEN --env=preview
wrangler secret put BETTER_AUTH_SECRET --env=preview
wrangler secret put NEXT_PUBLIC_GOOGLE_CLIENT_ID --env=preview
wrangler secret put GOOGLE_CLIENT_SECRET --env=preview
```
