# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start all apps**: `pnpm dev` (runs all apps via Turborepo)
- **Start API only**: `pnpm dev:api` (Hono API with Bun)
- **Start mobile app only**: `pnpm dev:app` (Expo app)
- **Build for production**: `pnpm build`
- **Type checking**: `pnpm typecheck`
- **Linting**: `pnpm lint`
- **Install dependencies**: `pnpm install`
- **Database migrations**: `pnpm migrate`, `pnpm migrate:up`, `pnpm migrate:down`
- **Remote migrations**: `pnpm migrate-remote`, `pnpm migrate-remote:up`
- **Validate environment**: `pnpm validate-env` (see Environment Configuration section)

## Architecture Overview

**Fútbol con los pibes** is a modern monorepo football match organization app built with Expo (mobile/web) and a Hono API backend.

### Monorepo Structure
This is a **Turborepo** monorepo using **pnpm workspaces** with the following structure:

#### Apps (`apps/`)
- **`api/`** - Hono API server
  - Backend API with oRPC for type-safe endpoints
  - BetterAuth integration for authentication
  - Zod validation with Hono middleware
  - Local development: `pnpm dev:api` (runs with Bun)
  - Production: Deployed to Cloudflare Workers
  - Cloudflare dev: `pnpm cf:dev` (in apps/api folder)

- **`mobile-web/`** - Expo universal app (iOS, Android, Web)
  - Expo Router for file-based navigation
  - Tamagui for universal UI components
  - i18next for internationalization (English/Spanish)
  - React Native with web support
  - Run with: `pnpm dev:app`
  - **Note**: TypeScript checking disabled due to Tamagui type recursion issues

#### Packages (`packages/`)
- **`@repo/api-client`** - Type-safe API client
  - Hono RPC client (`hc`) for consuming the Hono API
  - TanStack React Query hooks for data fetching
  - BetterAuth client for authentication

- **`@repo/shared`** - Shared business logic and utilities
  - Domain models and types
  - Services and repositories
  - Database schemas and migrations
  - Utility functions (date/time, validation)
  - Environment configuration

- **`@repo/ui`** - Shared UI components
  - Tamagui-based universal components
  - Works across mobile, web, and native platforms
  - Date pickers, forms, and common UI elements

### Key Technologies
- **Frontend**: Expo, React 19, React Native, TypeScript, Tamagui
- **Backend**: Hono (with built-in RPC), Bun runtime
- **UI Components**: Tamagui (universal design system)
- **Authentication**: BetterAuth with Google OAuth + Expo integration
- **Database**: Turso (LibSQL) with Kysely query builder
- **Internationalization**: i18next + expo-localization (English/Spanish)
- **Validation**: Zod schemas across frontend and backend
- **State Management**: TanStack Query for server state
- **Date/Time**: date-fns and date-fns-tz for timezone-aware operations

### Authentication System
- BetterAuth with @better-auth/expo adapter
- **Google OAuth** provider for social login
- **Phone number authentication** with password-as-OTP pattern (see `docs/phone-auth-password-as-otp.md`)
- Expo SecureStore for token persistence (mobile)
- AsyncStorage + Bearer tokens for web (cross-domain auth)
- Database stores user sessions and profiles
- Two-tier role model: **platform role** (on `user.role`) + **group-relative role** (see next section)

### Group-oriented Scoping
Every group-scoped resource (match, location, court, signup, setting, invite, roster) belongs to a group. The API binds the active group per-request and authz decisions are group-relative.

**Platform roles** (`user.role`):
- `user` — default; no platform-level privileges.
- `admin` — full cross-group access; only one today (Ignacio). Acts as the "platform admin" escape hatch.

**Group-relative roles** (`group_members.role`):
- `member` — default; can view/join matches of the group.
- `organizer` — can manage matches, locations, courts, invites, roster for that group. Owner (see below) is always an organizer.

**Ownership**: `groups.owner_user_id` points at a single organizer member; owner is the only one who can delete the group or transfer ownership.

**Active group**: client sends `X-Group-Id: <groupId>` on every scoped request. `apps/api/src/middleware/group-context.ts` resolves it to a `currentGroup: { id, role, isOwner }` via `requireCurrentGroup(c)`. The mobile client persists the active id via `packages/api-client/src/group-storage.ts`; the fetch wrapper in `client.ts` injects the header automatically.

**Authz helpers** (`apps/api/src/middleware/authz.ts`) — use these at the route boundary:
- `assertInCurrentGroup(c, id)` — 404 if the path `:id` doesn't match the active group (platform admin bypasses).
- `requireOrganizer(c)` / `requireOwner(c)` / `requirePlatformAdmin(c)` — return a 403 `Response` or `null`.
- `isPlatformAdmin(c)` — boolean check for field-level gating (e.g., `visibility` in PATCH /groups/:id).

**Platform-admin escape hatch**: `user.role === "admin"` passes every group-gated check regardless of group membership. Do not conflate with the group-level `organizer` role on `group_members`.

**Ghost roster**: `group_roster` holds named non-users (guests added by organizers). Ghost auto-claims by phone/email when a matching user accepts an invite (`GroupService.acceptInvite`). See `docs/group-visibility.md` for the public/private flag.

**Deprecated**: `match_invitations` table + `MatchInvitationRepository` are not wired to any active route or UI (only GDPR cleanup touches the table). Treat as dead code; don't build against it.

**Observability**: `GroupService` emits structured JSON logs on `group.created`, `invite.accepted`, `ghost.claimed`, `group.ownership_transferred` — picked up by Cloudflare Workers logs.

### Notifications System
Two layers:
1. **Transient push** — Expo Push API (`https://exp.host/--/api/v2/push/send`). Opt-in, native-only (web returns `osStatus: "unsupported"`).
2. **Persistent inbox** — DB-backed, group-scoped, available on web and native. Read via the bell icon in the home-screen header.

**Tables**:
- `push_tokens` — device tokens per user (`migrations/20260407120000-add-push-tokens.ts`).
- `user_notification_prefs` — master toggle + 3 category toggles. Absent row = all on (COALESCE) (`migrations/20260428120000-add-user-notification-prefs.ts`).
- `notifications` — inbox rows: `(id, user_id, group_id, type, category, title, body, data_json, read_at, created_at)`. Indexed on `(user_id, group_id, created_at DESC)` and `(user_id, read_at)` (`migrations/20260429120000-add-notifications-inbox.ts`).

**Types and categories** (`packages/shared/src/domain/types.ts`):
- `NOTIFICATION_TYPES` — 12 event types (match_created, match_updated, match_cancelled, player_confirmed, substitute_promoted, player_cancelled, removed_from_match, match_reminder, payment_reminder, voting_open, engagement_reminder, group_invite). **Reuse this constant; never redefine.**
- `NOTIFICATION_CATEGORIES` — 3 opt-in categories (`new_match`, `match_reminder`, `promo_to_confirmed`) backed by `user_notification_prefs` columns.
- **Push delivery rule**: categorized sends honor per-category opt-out; transactional sends honor only the master toggle.
- **Inbox persistence rule**: independent of push opt-out — a user with push off still sees rows. Ensures the inbox is the canonical history.

**Server modules**:
- Templates: `packages/shared/src/services/notification-templates.ts` — every template encodes `data.type` and `data.screen` (deep-link).
- Send service (Expo): `packages/shared/src/services/notification-service.ts`.
- Token repo (with prefs JOIN): `packages/shared/src/repositories/push-token-repository.ts`.
- Inbox repo: `packages/shared/src/repositories/notification-inbox-repository.ts` — `insertMany`, `listByUserAndGroup`, `unreadCount`, `markRead`, `markAllRead`, `deleteOlderThan`.
- Inbox recorder: `apps/api/src/lib/notification-inbox.ts` (`recordForRecipients`).
- Event helpers (the call sites): `apps/api/src/lib/notify.ts` (`notifyMatchCreated`, `notifyMatchUpdated`, `notifyMatchCancelled`, `notifyPlayerConfirmed`, `notifySubstitutePromoted`, `notifyPlayerCancelled`, `notifyRemovedFromMatch`, `notifyGroupInviteTarget`).
- Cron senders: `apps/api/src/cron/{send-match-reminders,send-engagement-reminders,update-match-statuses,prune-inbox-notifications}.ts`. All registered in the worker's `scheduled` handler (`apps/api/src/worker.ts`) and behind manual trigger endpoints in `apps/api/src/routes/cron.ts`.
- API routes: `apps/api/src/routes/notifications.ts` — `GET /api/notifications` (list, group-scoped), `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all`, `POST /api/notifications/send-test` (admin only). Push token + preferences endpoints stay separate at `push-tokens.ts` / `notification-preferences.ts`.

**Adding a new notification** (cookbook):
1. Add the type to `NOTIFICATION_TYPES` if it's truly new.
2. Add a template in `notification-templates.ts` (must include `data.type` and `data.screen`).
3. Add a helper in `apps/api/src/lib/notify.ts` that calls `recordForRecipients(...)` first, then `getNotificationService().sendToUsers(...)`. Wrap in `safeNotify`.
4. Wire the helper at the call site (route or cron). For match-related events, recipients should be intersected with group members (see `getGroupMemberIds` / `intersect` helpers in `notify.ts`).
5. If the deep-link logic is non-trivial, extend `getNotificationRoute(data)` in `packages/shared/src/utils/notification-routes.ts` (the shared resolver used by both push-tap and inbox-tap handling).
6. **Group invites are intentionally NOT persisted to the inbox** — the dedicated invite-acceptance flow surfaces them and the target may not yet be a registered user.
7. Do NOT call the Expo Push API directly from feature code.

**Retention**: inbox rows older than 10 days are pruned by `pruneInboxNotifications` (runs alongside other crons every 30 min — cheap, idempotent).

**Client (mobile-web)**:
- Push setup + listeners: `apps/mobile-web/lib/use-push-notifications.ts` (lazy-loaded; web is no-op).
- Permission UX + master toggle context: `apps/mobile-web/lib/notifications/notification-preferences-context.tsx`, `components/notifications/notification-permission-prompt.tsx`.
- Preferences screen: `apps/mobile-web/app/(tabs)/profile/notifications.tsx` (hidden on web).
- Inbox: bell in the home-screen header (`components/notifications/inbox-bell.tsx`) opens `app/inbox.tsx`. The list lives in `components/notifications/notification-inbox.tsx`; routing on tap goes through `getNotificationRoute(item.data)` so push-tap and inbox-tap stay in sync. **Inbox works on both web and native**; the preferences screen does not.
- API client hooks: `useNotifications`, `useUnreadNotificationCount`, `useMarkNotificationRead`, `useMarkAllNotificationsRead` (`packages/api-client/src/notifications-inbox.ts`). Plus existing `useNotificationPreferences`/`useUpdateNotificationPreferences`.
- i18n root: `notifications.*` (preferences UX) and `notifications.inbox.*` (inbox UX) in `locales/{en,es}/common.json`. Type labels live at `notifications.inbox.types.<NotificationType>`.

**Deep-link convention**: `payload.data.screen` is the canonical route. Both the push tap handler (`use-push-notifications.ts`) and the inbox screen (`app/inbox.tsx`) navigate via `router.push(getNotificationRoute(data))`.

### Database Configuration
- **Primary**: Turso (LibSQL) database via `@libsql/kysely-libsql`
- Connection configured via `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- Migrations managed via scripts in root package.json
- Local development uses SQLite

### Environment Configuration
The app uses a comprehensive environment validation system managed from the root:

**Environment Validation**:
- `pnpm validate-env` - Validate current environment (default command)
- `pnpm env:check` - Check environment variables
- `pnpm env:template` - Generate .env template
- Automatic validation on app startup (exits in development, logs in production)

**Required Variables**:
- `BETTER_AUTH_SECRET` - Authentication encryption key
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `TURSO_DATABASE_URL` - Turso database connection URL
- `TURSO_AUTH_TOKEN` - Turso authentication token
- `DEFAULT_TIMEZONE` - Application timezone (defaults to Europe/Berlin)
- `API_URL` - Backend API URL for mobile/web app
- `EXPO_PUBLIC_*` - Public environment variables for Expo app

### Timezone Handling
The application implements comprehensive timezone support to ensure consistent date handling:

**Default Timezone**: Europe/Berlin
- All dates are processed and stored relative to Berlin timezone
- Prevents day-shifting issues when users create matches from different timezones
- Configurable via `DEFAULT_TIMEZONE` environment variable

**Key Utilities** (`packages/shared/src/utils/timezone.ts`):
- `convertToAppTimezone(date)` - Convert user input to Berlin timezone
- `formatDateInAppTimezone(date, format)` - Format dates in Berlin timezone
- `formatDisplayDate(date, format)` - Display dates consistently
- `formatDisplayDateTime(date, time, format)` - Format date/time combinations

**Implementation**:
- Form submissions use `convertToAppTimezone()` instead of UTC conversion
- All date displays use timezone-aware formatting functions
- Calendar downloads and exports maintain timezone consistency
- Match listings show dates in Berlin timezone regardless of user location
- Shared across mobile, web, and API via `@repo/shared` package

### Accessibility & Automation Identifiers
Interactive elements follow a shared convention so screen readers AND automation tools (Chrome DevTools MCP, agent-browser) can reliably identify them.

- Priority: **semantic role + accessible name first**, `testID` only as a fallback for repeated/ambiguous elements. Chrome DevTools MCP snapshots the accessibility tree, not the DOM.
- Icon-only buttons require `accessibilityLabel` (from the `a11y` i18n namespace). Any `Pressable` acting as a button requires `accessibilityRole="button"`.
- `testID` naming: kebab-case hierarchical, `{screen}-{element}[-{id}]` (e.g. `matches-fab-add`, `matches-card-42`).

Full convention, examples, and verification steps: [`docs/accessibility-and-test-ids.md`](docs/accessibility-and-test-ids.md).

### Development Workflow
1. **Install dependencies**: `pnpm install` (installs for all workspaces)
2. **Start development**: `pnpm dev` (starts API and mobile app concurrently)
3. **Run individual apps**: Use `pnpm dev:api` or `pnpm dev:app`
4. **Type checking**: `pnpm typecheck` (checks all packages and apps)
5. **Database migrations**: Use migration scripts for schema changes
6. **Environment setup**: Copy `.env.example` and configure variables

### Deployment Architecture
The application uses a split deployment architecture:

**Expo Web App** - Vercel
- Deployed as static SPA from `apps/mobile-web/dist`
- Configured via `vercel.json` in root
- Auto-deploys on push to main branch
- Set `EXPO_PUBLIC_API_URL` in Vercel to point to Cloudflare Workers API

**Hono API** - Cloudflare Workers
- Deployed via `wrangler` from `apps/api`
- Configuration in `apps/api/wrangler.toml`

| Environment | URL | Database |
|-------------|-----|----------|
| Production | `https://football-api.pepe-grillo-parlante.workers.dev` | `football-with-friends-pepegrillo` |
| Staging | `https://football-api-staging.pepe-grillo-parlante.workers.dev` | `football-with-friends-staging-pepegrillo` |

**Deploy commands** (from `apps/api`):
- `pnpm cf:deploy` - Deploy to production
- `pnpm cf:deploy:preview` - Deploy to staging
- `pnpm cf:tail` - View production logs
- `pnpm cf:tail --env=preview` - View staging logs

**Required Cloudflare Secrets** (set for both production and staging):
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

**Vercel Environment Variables**:
- Production: `EXPO_PUBLIC_API_URL=https://football-api.pepe-grillo-parlante.workers.dev`
- Preview: `EXPO_PUBLIC_API_URL=https://football-api-staging.pepe-grillo-parlante.workers.dev`

### Monorepo Benefits
- **Code Sharing**: Common types, utilities, and components across apps
- **Type Safety**: End-to-end type safety from API to client via Hono RPC
- **Consistent Tooling**: Shared TypeScript, ESLint configs
- **Efficient Development**: Turborepo caching and parallel execution
- **Universal Code**: Write once, run on mobile, web, and native platforms
