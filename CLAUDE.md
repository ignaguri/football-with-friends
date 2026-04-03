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
- Admin role system with role-based access

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
