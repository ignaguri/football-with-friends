# Configuration

## Environment Variables

The app uses a comprehensive environment validation system managed from the root.

**Commands**:

- `pnpm validate-env` — validate current environment
- `pnpm env:check` — check environment variables
- `pnpm env:template` — generate .env template
- Automatic validation on app startup (exits in development, logs in production)

**Required Variables**:

- `BETTER_AUTH_SECRET` — authentication encryption key
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth credentials
- `TURSO_DATABASE_URL` — Turso database connection URL
- `TURSO_AUTH_TOKEN` — Turso authentication token
- `DEFAULT_TIMEZONE` — application timezone (defaults to `Europe/Berlin`)
- `API_URL` — backend API URL for mobile/web app
- `EXPO_PUBLIC_*` — public environment variables for the Expo app

## Timezone Handling

**Default timezone**: `Europe/Berlin`. All dates are processed and stored relative to Berlin time to prevent day-shifting when users create matches from different timezones. Configurable via `DEFAULT_TIMEZONE`.

**Key utilities** (`packages/shared/src/utils/timezone.ts`):

- `convertToAppTimezone(date)` — convert user input to Berlin timezone
- `formatDateInAppTimezone(date, format)` — format dates in Berlin timezone
- `formatDisplayDate(date, format)` — display dates consistently
- `formatDisplayDateTime(date, time, format)` — format date/time combinations

**Rules**:

- Form submissions use `convertToAppTimezone()` instead of UTC conversion.
- All date displays use timezone-aware formatting functions.
- Calendar downloads and exports maintain timezone consistency.
- Match listings show dates in Berlin timezone regardless of user location.
- Shared across mobile, web, and API via `@repo/shared`.
