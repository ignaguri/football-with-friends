# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `pnpm dev` (uses Turbopack for faster builds)
- **Build for production**: `pnpm build`
- **Type checking**: `pnpm typecheck`
- **Linting**: `pnpm lint`
- **Secure development**: `pnpm dev:secure` (HTTPS)
- **Install dependencies**: `pnpm install`
- **Validate environment**: `pnpm validate-env` (see Environment Configuration section)

## Architecture Overview

**Fútbol con los pibes** is a Next.js 15 football match organization app using the App Router architecture.

### Key Technologies
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI Components**: Radix UI primitives with shadcn/ui patterns
- **Authentication**: BetterAuth with Google OAuth
- **Database**: Turso (LibSQL) with Kysely query builder
- **Monitoring**: Sentry for error tracking
- **Internationalization**: next-intl (English/Spanish)
- **Forms**: React Hook Form with Zod validation
- **State Management**: TanStack Query for server state
- **Date/Time**: date-fns and date-fns-tz for timezone-aware operations

### Directory Structure
- `app/` - Next.js App Router pages and layouts
  - `(auth)/` - Authentication pages
  - `matches/` - Match listing and details
  - `organizer/` - Match management for organizers
  - `add-match/` - Match creation
  - `api/` - API routes
- `components/ui/` - Reusable UI components (Radix-based)
- `lib/` - Core utilities and configurations
  - `auth.ts` - BetterAuth configuration
  - `google-sheets.ts` - Google Sheets integration
  - `types.ts` - TypeScript type definitions
  - `utils/timezone.ts` - Timezone utilities and date handling
- `hooks/` - Custom React hooks
- `locales/` - Internationalization files
- `types/` - Global TypeScript types

### Authentication System
- Uses BetterAuth with Google OAuth provider
- Database stores user sessions and profiles
- Admin role system with role-based access
- Trusted origins configured for Vercel deployments

### Database Configuration
- **Primary**: Turso (LibSQL) database via `@libsql/kysely-libsql`
- **Backup**: Google Sheets integration for match data
- Connection configured via `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`

### Build Configuration
- Next.js config includes libsql package handling
- Webpack configured for native module fallbacks
- ESLint errors ignored during production builds (see next.config.ts:10)
- Sentry integration with source map uploads

### Environment Configuration
The app uses a comprehensive environment validation system:

**Storage Provider Selection**: Set `STORAGE_PROVIDER` to:
- `google-sheets` - Use Google Sheets (current production)
- `turso` - Use Turso database (production recommended)  
- `local-db` - Use local SQLite (development)

**Environment Validation**:
- `pnpm validate-env` - Validate current environment (default command)
- `pnpm validate-env requirements [provider]` - Show required variables
- `pnpm validate-env template [provider]` - Generate .env template
- `pnpm validate-env help` - Show all available commands
- Automatic validation on app startup (exits in development, logs in production)
- Validates conditionally based on STORAGE_PROVIDER setting

**Required Variables** (vary by storage provider):
- `BETTER_AUTH_SECRET` - Authentication encryption key
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth
- `DEFAULT_TIMEZONE` - Application timezone (defaults to Europe/Berlin)
- Storage-specific variables (validated automatically)

### Timezone Handling
The application implements comprehensive timezone support to ensure consistent date handling:

**Default Timezone**: Europe/Berlin
- All dates are processed and stored relative to Berlin timezone
- Prevents day-shifting issues when users create matches from different timezones
- Configurable via `DEFAULT_TIMEZONE` environment variable

**Key Utilities** (`lib/utils/timezone.ts`):
- `convertToAppTimezone(date)` - Convert user input to Berlin timezone
- `formatDateInAppTimezone(date, format)` - Format dates in Berlin timezone
- `formatDisplayDate(date, format)` - Display dates consistently
- `formatDisplayDateTime(date, time, format)` - Format date/time combinations

**Implementation**:
- Form submissions use `convertToAppTimezone()` instead of UTC conversion
- All date displays use timezone-aware formatting functions
- Calendar downloads and exports maintain timezone consistency
- Match listings show dates in Berlin timezone regardless of user location