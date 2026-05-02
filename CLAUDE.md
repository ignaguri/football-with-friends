# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Coding Guidelines

Before starting any implementation task, invoke the `andrej-karpathy-skills:karpathy-guidelines` skill.

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

Every group-scoped resource belongs to a group; authz is group-relative. Two role axes: **platform role** (`user.role`: `user` | `admin`) and **group-relative role** (`group_members.role`: `member` | `organizer`). The client sends `X-Group-Id` on every scoped request; use the helpers in `apps/api/src/middleware/authz.ts` at route boundaries.

See [`docs/groups.md`](docs/groups.md) for full details: role definitions, ownership, active-group mechanics, authz helpers, ghost roster, and deprecated tables.

### Notifications System

Two layers: **transient push** (Expo Push API, native-only, opt-in) and **persistent inbox** (DB-backed, group-scoped, web + native). Key rule: always use the helpers in `apps/api/src/lib/notify.ts` — never call the Expo Push API directly.

See [`docs/notifications.md`](docs/notifications.md) for full details: DB tables, types/categories, server modules, client files, delivery rules, retention policy, and the step-by-step cookbook for adding new notification types.

### Database Configuration

- **Primary**: Turso (LibSQL) database via `@libsql/kysely-libsql`
- Connection configured via `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- Migrations managed via scripts in root package.json
- Local development uses SQLite

### Environment & Timezone Configuration

Default timezone is `Europe/Berlin` (configurable via `DEFAULT_TIMEZONE`). Use `pnpm validate-env` to check required variables. Always use the timezone helpers from `packages/shared/src/utils/timezone.ts` — never convert dates to UTC directly.

See [`docs/configuration.md`](docs/configuration.md) for required env vars, validation commands, and timezone utility reference.

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

Web app on Vercel (auto-deploy from main), API on Cloudflare Workers (`pnpm cf:deploy` / `pnpm cf:deploy:preview` from `apps/api`).

See [`docs/deployment.md`](docs/deployment.md) for environment URLs, deploy commands, required Cloudflare secrets, and Vercel env vars.

### Monorepo Benefits

- **Code Sharing**: Common types, utilities, and components across apps
- **Type Safety**: End-to-end type safety from API to client via Hono RPC
- **Consistent Tooling**: Shared TypeScript, ESLint configs
- **Efficient Development**: Turborepo caching and parallel execution
- **Universal Code**: Write once, run on mobile, web, and native platforms
