# Football with Friends - API

Hono + oRPC backend for the Football with Friends application.

## Tech Stack

- **Framework**: Hono (lightweight web framework)
- **Runtime**: Bun
- **Type Safety**: oRPC (type-safe RPC)
- **Authentication**: Better Auth
- **Database**: Turso (SQLite) with Kysely ORM
- **Validation**: Zod

## Getting Started

### Prerequisites

- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- Environment variables configured (see `.env.example`)

### Installation

```bash
# From monorepo root
pnpm install

# Or from this directory
pnpm install
```

### Development

```bash
# From monorepo root
pnpm dev:api

# Or from this directory
pnpm dev
```

The API will be available at `http://localhost:3001`

### Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in the required environment variables:
   - Database credentials (Turso or local)
   - Google OAuth credentials
   - Better Auth secret

### API Endpoints

#### Health Check

- `GET /health` - Health check endpoint

#### Authentication (Better Auth)

- `POST /api/auth/*` - Better Auth endpoints
- `GET /api/auth/*` - Better Auth endpoints

#### oRPC Endpoint

- `POST /rpc/*` - oRPC procedures

## oRPC Procedures

### Matches

- `matches.getAll({ type })` - Get all matches
- `matches.getById({ id, userId? })` - Get match details
- `matches.create({ ... })` - Create match (admin only)
- `matches.update({ id, data })` - Update match (admin only)
- `matches.delete({ id })` - Delete match (admin only)

#### Match Signups

- `matches.signup.create({ matchId, ... })` - Sign up for match
- `matches.signup.updateStatus({ matchId, signupId, status })` - Update signup status
- `matches.signup.remove({ matchId, signupId })` - Remove signup
- `matches.signup.addPlayer({ matchId, ... })` - Admin add player (admin only)

### Courts

- `courts.getAll({ locationId? })` - Get all courts
- `courts.getById({ id })` - Get court details
- `courts.create({ ... })` - Create court (admin only)
- `courts.update({ id, data })` - Update court (admin only)
- `courts.delete({ id })` - Delete court (admin only)

### Locations

- `locations.getAll()` - Get all locations
- `locations.getById({ id })` - Get location details
- `locations.create({ ... })` - Create location
- `locations.update({ id, data })` - Update location
- `locations.delete({ id })` - Delete location

## Project Structure

```
apps/api/
├── src/
│   ├── index.ts              # Main entry point
│   ├── auth.ts               # Better Auth configuration
│   ├── middleware/
│   │   └── auth.ts           # Auth middleware for oRPC
│   ├── procedures/
│   │   ├── matches.ts        # Match procedures
│   │   ├── courts.ts         # Court procedures
│   │   └── locations.ts      # Location procedures
│   └── orpc/
│       └── index.ts          # oRPC router
├── package.json
├── tsconfig.json
└── .env.example
```

## Building for Production

```bash
pnpm build
pnpm start
```

## Type Safety

The API exports its router type (`AppRouter`) which can be used by the client for end-to-end type safety with oRPC.
