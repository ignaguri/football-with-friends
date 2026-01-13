# Universal App Migration Plan

**Goal**: Migrate "Fútbol con los pibes" from Next.js web-only to a universal Expo app (web + iOS + Android) with a standalone Hono API backend.

**Architecture Overview**:
```
monorepo/
├── apps/
│   ├── mobile-web/          # Expo Router (web + iOS + Android)
│   └── api/                 # Hono + oRPC backend
├── packages/
│   ├── shared/              # Business logic (from current lib/)
│   ├── ui/                  # Tamagui universal components
│   └── api-client/          # oRPC typed client
└── tooling/
    └── typescript/          # Shared tsconfig
```

**Tech Stack**:
- **Monorepo**: Turborepo
- **Package Manager**: pnpm (keep current)
- **API Framework**: Hono
- **API Type Safety**: oRPC
- **API Runtime**: Bun
- **Frontend Framework**: Expo Router
- **Frontend Runtime**: Node.js
- **UI Library**: Tamagui
- **ORM**: Kysely (keep current)
- **Database**: Turso (keep current)
- **Auth**: Better-Auth (keep current)

---

## Phase 0: Prerequisites & Validation

### 0.1 Understand Current Architecture

**Read these files to understand the codebase**:
- `lib/services/match-service.ts` - Core business logic
- `lib/repositories/` - Data access layer
- `lib/domain/types.ts` - Domain models
- `lib/auth.ts` - Better-Auth configuration
- `app/api/` - Current API routes
- `components/ui/` - Current UI components

**Key patterns to preserve**:
- Service layer abstractions
- Repository interfaces (dual storage support)
- Timezone utilities
- Domain types and validation schemas

### 0.2 Install Required Tools

```bash
# Install Turborepo globally
pnpm add -g turbo

# Install Bun for API runtime
curl -fsSL https://bun.sh/install | bash

# Verify installations
turbo --version
bun --version
```

### 0.3 Create Backup Branch

```bash
git checkout -b backup/pre-migration
git push origin backup/pre-migration
git checkout -b feat/universal-app-migration
```

---

## Phase 1: Monorepo Setup

### 1.1 Initialize Turborepo Structure

**Create new monorepo structure** (alongside existing code):

```bash
# Create directories
mkdir -p apps/mobile-web apps/api
mkdir -p packages/shared packages/ui packages/api-client
mkdir -p tooling/typescript
```

### 1.2 Setup Root Package.json

**Create/update `package.json` at root**:

```json
{
  "name": "football-with-friends-monorepo",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "clean": "turbo clean && rm -rf node_modules",
    "dev:api": "turbo dev --filter=api",
    "dev:app": "turbo dev --filter=mobile-web"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.2"
  }
}
```

### 1.3 Create Turborepo Config

**Create `turbo.json`**:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", ".expo/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 1.4 Setup pnpm Workspaces

**Create `pnpm-workspace.yaml`**:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tooling/*'
```

### 1.5 Create Shared TypeScript Config

**Create `tooling/typescript/base.json`**:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "incremental": true
  }
}
```

**Create `tooling/typescript/package.json`**:

```json
{
  "name": "@repo/typescript-config",
  "version": "0.0.0",
  "private": true,
  "files": ["base.json", "expo.json", "hono.json"]
}
```

---

## Phase 2: Extract Shared Code

### 2.1 Setup Shared Package

**Create `packages/shared/package.json`**:

```json
{
  "name": "@repo/shared",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./domain": "./src/domain/index.ts",
    "./services": "./src/services/index.ts",
    "./repositories": "./src/repositories/index.ts",
    "./utils": "./src/utils/index.ts",
    "./database": "./src/database/index.ts",
    "./mappers": "./src/mappers/index.ts"
  },
  "dependencies": {
    "kysely": "^0.28.5",
    "@libsql/kysely-libsql": "^0.4.1",
    "@libsql/client": "^0.15.15",
    "libsql": "^0.5.22",
    "date-fns": "^4.1.0",
    "date-fns-tz": "^3.2.0",
    "zod": "^4.1.5"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.7.2"
  }
}
```

### 2.2 Move Business Logic

**Copy these directories from current codebase to `packages/shared/src/`**:

1. **Domain types**: `lib/domain/` → `packages/shared/src/domain/`
   - `types.ts` - All domain types
   - Keep all interfaces, constants, DTOs

2. **Services**: `lib/services/` → `packages/shared/src/services/`
   - `match-service.ts`
   - `court-service.ts`
   - `factory.ts`
   - Preserve all business logic

3. **Repositories**: `lib/repositories/` → `packages/shared/src/repositories/`
   - `interfaces.ts`
   - `turso/` subdirectory
   - `google-sheets/` subdirectory
   - `factory.ts`

4. **Utils**: `lib/utils/` → `packages/shared/src/utils/`
   - `timezone.ts` - Critical for date handling
   - `sentry.ts` - Error tracking

5. **Database**: `lib/database/` → `packages/shared/src/database/`
   - `schema.ts`
   - `connection.ts`
   - All database utilities

6. **Mappers**: `lib/mappers/` → `packages/shared/src/mappers/`
   - `display-mappers.ts`
   - `domain-mappers.ts`

### 2.3 Create Index Files

**Create `packages/shared/src/domain/index.ts`**:

```typescript
export * from './types'
export * from './constants'
```

**Create `packages/shared/src/services/index.ts`**:

```typescript
export * from './match-service'
export * from './court-service'
export * from './factory'
```

**Create similar index files for**:
- `repositories/index.ts`
- `utils/index.ts`
- `database/index.ts`
- `mappers/index.ts`

### 2.4 Update Import Paths

**In copied files, update imports**:

```typescript
// Before:
import { Match } from '@/lib/domain/types'
import { MatchRepository } from '@/lib/repositories/interfaces'

// After:
import { Match } from '../domain/types'
import { MatchRepository } from '../repositories/interfaces'
```

**Remove Next.js-specific imports** (will be handled by API layer):
- Remove `@/` aliases
- Remove any Next.js imports (headers, cookies, etc.)

### 2.5 Environment Validation

**Copy `lib/env/` to `packages/shared/src/env/`**:

- `validation.ts` - Environment validation logic
- `types.ts` - Environment variable types

**Update validation to be framework-agnostic** (remove Next.js specifics).

---

## Phase 3: Build Hono API Backend

### 3.1 Setup API Package

**Create `apps/api/package.json`**:

```json
{
  "name": "api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "start": "bun dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/shared": "workspace:*",
    "hono": "^4.7.13",
    "orpc": "^0.3.0",
    "@orpc/server": "^0.3.0",
    "@orpc/zod": "^0.3.0",
    "zod": "^4.1.5",
    "better-auth": "^1.3.9",
    "@hono/zod-validator": "^0.4.1",
    "@hono/cors": "^1.0.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@types/bun": "latest",
    "typescript": "^5.7.2"
  }
}
```

### 3.2 Create API Entry Point

**Create `apps/api/src/index.ts`**:

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { auth } from './auth'
import { matchesRouter } from './routes/matches'
import { courtsRouter } from './routes/courts'
import { locationsRouter } from './routes/locations'
import { orpcHandler } from './orpc'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8081'],
  credentials: true,
}))

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

// Better Auth
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw)
})

// API Routes (traditional REST)
app.route('/api/matches', matchesRouter)
app.route('/api/courts', courtsRouter)
app.route('/api/locations', locationsRouter)

// oRPC endpoint
app.use('/rpc/*', orpcHandler)

const port = process.env.PORT || 3001

console.log(`🚀 API Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
```

### 3.3 Setup Better Auth

**Create `apps/api/src/auth.ts`**:

```typescript
import { betterAuth } from 'better-auth'
import { createKyselyAdapter } from '@libsql/kysely-libsql'
import { db } from '@repo/shared/database'

export const auth = betterAuth({
  database: createKyselyAdapter(db, {
    dialect: 'sqlite',
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
    },
  },
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',') || [],
})
```

### 3.4 Create oRPC Router

**Create `apps/api/src/orpc/index.ts`**:

```typescript
import { createORPCHandler } from '@orpc/server'
import { matchesProcedures } from './procedures/matches'
import { courtsProcedures } from './procedures/courts'
import { locationsProcedures } from './procedures/locations'

// Combine all procedures
export const appRouter = {
  matches: matchesProcedures,
  courts: courtsProcedures,
  locations: locationsProcedures,
}

export type AppRouter = typeof appRouter

// Create Hono handler
export const orpcHandler = createORPCHandler({
  router: appRouter,
})
```

**Create `apps/api/src/orpc/procedures/matches.ts`**:

```typescript
import { z } from 'zod'
import { createProcedure } from '@orpc/server'
import { matchService } from '@repo/shared/services'
import { CreateMatchDTO, UpdateMatchDTO } from '@repo/shared/domain'
import { withAuth, withAdminAuth } from '../middleware/auth'

const baseProcedure = createProcedure()

export const matchesProcedures = {
  // Get all matches
  getAll: baseProcedure
    .input(z.object({
      type: z.enum(['upcoming', 'past', 'all']).optional(),
    }))
    .query(async ({ input }) => {
      return matchService.getMatches(input.type || 'upcoming')
    }),

  // Get single match
  getById: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return matchService.getMatchById(input.id)
    }),

  // Create match (admin only)
  create: baseProcedure
    .use(withAdminAuth)
    .input(z.custom<CreateMatchDTO>())
    .mutation(async ({ input, ctx }) => {
      return matchService.createMatch(input, ctx.user.id)
    }),

  // Update match (admin only)
  update: baseProcedure
    .use(withAdminAuth)
    .input(z.object({
      id: z.string(),
      data: z.custom<UpdateMatchDTO>(),
    }))
    .mutation(async ({ input }) => {
      return matchService.updateMatch(input.id, input.data)
    }),

  // Delete match (admin only)
  delete: baseProcedure
    .use(withAdminAuth)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return matchService.deleteMatch(input.id)
    }),

  // Signup procedures
  signup: {
    // Sign up for match
    create: baseProcedure
      .use(withAuth)
      .input(z.object({
        matchId: z.string(),
        playerName: z.string().optional(),
        playerEmail: z.string().email().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return matchService.signupPlayer(
          input.matchId,
          ctx.user.id,
          input.playerName,
          input.playerEmail
        )
      }),

    // Update signup status
    update: baseProcedure
      .use(withAuth)
      .input(z.object({
        matchId: z.string(),
        signupId: z.string(),
        status: z.enum(['PAID', 'PENDING', 'CANCELLED']),
      }))
      .mutation(async ({ input }) => {
        return matchService.updateSignupStatus(
          input.matchId,
          input.signupId,
          input.status
        )
      }),

    // Remove signup
    remove: baseProcedure
      .use(withAuth)
      .input(z.object({
        matchId: z.string(),
        signupId: z.string(),
      }))
      .mutation(async ({ input }) => {
        return matchService.removeSignup(input.matchId, input.signupId)
      }),
  },
}
```

### 3.5 Create Auth Middleware

**Create `apps/api/src/orpc/middleware/auth.ts`**:

```typescript
import { createMiddleware } from '@orpc/server'
import { auth } from '../../auth'

export const withAuth = createMiddleware(async ({ ctx, next }) => {
  const session = await auth.getSession(ctx.request)

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  return next({
    ctx: {
      ...ctx,
      user: session.user,
      session,
    },
  })
})

export const withAdminAuth = createMiddleware(async ({ ctx, next }) => {
  const session = await auth.getSession(ctx.request)

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  if (session.user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }

  return next({
    ctx: {
      ...ctx,
      user: session.user,
      session,
    },
  })
})
```

### 3.6 Create Traditional REST Routes (Optional)

**Create `apps/api/src/routes/matches.ts`** (for backwards compatibility):

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { matchService } from '@repo/shared/services'
import { createMatchSchema } from '@repo/shared/domain'

export const matchesRouter = new Hono()

matchesRouter.get('/', async (c) => {
  const type = c.req.query('type') || 'upcoming'
  const matches = await matchService.getMatches(type as any)
  return c.json(matches)
})

matchesRouter.get('/:id', async (c) => {
  const id = c.req.param('id')
  const match = await matchService.getMatchById(id)
  return c.json(match)
})

matchesRouter.post('/',
  zValidator('json', createMatchSchema),
  async (c) => {
    // TODO: Add auth check
    const data = c.req.valid('json')
    const match = await matchService.createMatch(data, 'user-id')
    return c.json(match, 201)
  }
)

// Add more routes as needed
```

### 3.7 Environment Setup

**Create `apps/api/.env.example`**:

```env
# Database
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
STORAGE_PROVIDER=turso

# Auth
BETTER_AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# CORS
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006

# App
PORT=3001
DEFAULT_TIMEZONE=Europe/Berlin
```

---

## Phase 4: Setup oRPC Client

### 4.1 Create API Client Package

**Create `packages/api-client/package.json`**:

```json
{
  "name": "@repo/api-client",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "dependencies": {
    "@orpc/client": "^0.3.0",
    "@orpc/react": "^0.3.0",
    "@tanstack/react-query": "^5.87.1"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.7.2"
  }
}
```

### 4.2 Create Client

**Create `packages/api-client/src/index.ts`**:

```typescript
import { createORPCClient } from '@orpc/client'
import { createORPCReact } from '@orpc/react'
import type { AppRouter } from 'api/src/orpc'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'

// Create base client
export const orpcClient = createORPCClient<AppRouter>({
  baseURL: `${API_URL}/rpc`,
  fetch: (input, init) => {
    return fetch(input, {
      ...init,
      credentials: 'include', // Important for cookies
    })
  },
})

// Create React hooks
export const {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useSuspenseQuery,
} = createORPCReact<AppRouter>(orpcClient)

// Export typed client
export { orpcClient as api }
```

### 4.3 Create React Query Provider

**Create `packages/api-client/src/provider.tsx`**:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function APIProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

---

## Phase 5: Setup Expo Universal App

### 5.1 Create Expo App

```bash
cd apps
bunx create-expo-app mobile-web --template blank-typescript
cd mobile-web
```

### 5.2 Install Dependencies

**Update `apps/mobile-web/package.json`**:

```json
{
  "name": "mobile-web",
  "version": "0.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "dev": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build": "expo export",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/shared": "workspace:*",
    "@repo/api-client": "workspace:*",
    "expo": "^52.0.0",
    "expo-router": "^4.0.0",
    "react": "^19.2.0",
    "react-native": "^0.76.0",
    "react-native-safe-area-context": "^4.12.0",
    "react-native-screens": "^4.4.0",
    "@tamagui/core": "^1.120.0",
    "tamagui": "^1.120.0",
    "@tamagui/config": "^1.120.0",
    "better-auth": "^1.3.9",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@babel/core": "^7.25.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.2"
  }
}
```

### 5.3 Setup Expo Router

**Create `apps/mobile-web/app/_layout.tsx`**:

```typescript
import { Slot } from 'expo-router'
import { TamaguiProvider } from 'tamagui'
import { APIProvider } from '@repo/api-client/provider'
import config from '../tamagui.config'

export default function RootLayout() {
  return (
    <TamaguiProvider config={config}>
      <APIProvider>
        <Slot />
      </APIProvider>
    </TamaguiProvider>
  )
}
```

**Create `apps/mobile-web/app/index.tsx`**:

```typescript
import { View, Text } from 'tamagui'
import { Link } from 'expo-router'

export default function Home() {
  return (
    <View flex={1} justifyContent="center" alignItems="center">
      <Text fontSize="$8" fontWeight="bold">
        Fútbol con los pibes
      </Text>
      <Link href="/matches">
        <Text color="$blue10">View Matches</Text>
      </Link>
    </View>
  )
}
```

### 5.4 Setup Tamagui

**Create `apps/mobile-web/tamagui.config.ts`**:

```typescript
import { config as defaultConfig } from '@tamagui/config/v3'
import { createTamagui } from 'tamagui'

const config = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    // Customize themes here
  },
})

export type AppConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
```

**Create `apps/mobile-web/metro.config.js`**:

```javascript
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

config.resolver.sourceExts.push('mjs')

// Support pnpm monorepo
config.watchFolders = [
  ...config.watchFolders,
  '../../packages',
]

module.exports = config
```

### 5.5 Setup Environment

**Create `apps/mobile-web/.env`**:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...
```

**Create `apps/mobile-web/app.json`**:

```json
{
  "expo": {
    "name": "Fútbol con los pibes",
    "slug": "football-with-friends",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.footballwithfriends"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.footballwithfriends"
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-router"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

---

## Phase 6: Setup Tamagui UI Components

### 6.1 Create UI Package

**Create `packages/ui/package.json`**:

```json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "dependencies": {
    "tamagui": "^1.120.0",
    "@tamagui/core": "^1.120.0",
    "react": "^19.2.0",
    "react-native": "^0.76.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.7.2"
  }
}
```

### 6.2 Create Base Components

**Create `packages/ui/src/Button.tsx`**:

```typescript
import { Button as TamaguiButton, ButtonProps } from 'tamagui'

export function Button(props: ButtonProps) {
  return <TamaguiButton {...props} />
}
```

**Create `packages/ui/src/Card.tsx`**:

```typescript
import { Card as TamaguiCard, CardProps, YStack, Text } from 'tamagui'
import { ReactNode } from 'react'

export interface CardComponentProps extends CardProps {
  children: ReactNode
}

export function Card({ children, ...props }: CardComponentProps) {
  return (
    <TamaguiCard
      elevate
      size="$4"
      bordered
      {...props}
    >
      {children}
    </TamaguiCard>
  )
}

export function CardHeader({ children }: { children: ReactNode }) {
  return (
    <TamaguiCard.Header padded>
      {children}
    </TamaguiCard.Header>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="$6" fontWeight="bold">
      {children}
    </Text>
  )
}

export function CardContent({ children }: { children: ReactNode }) {
  return (
    <YStack padding="$4">
      {children}
    </YStack>
  )
}
```

**Create `packages/ui/src/index.ts`**:

```typescript
export { Button } from './Button'
export { Card, CardHeader, CardTitle, CardContent } from './Card'
// Export more components as you create them
```

---

## Phase 7: Implement Core Features

### 7.1 Match List Screen

**Create `apps/mobile-web/app/(tabs)/matches/index.tsx`**:

```typescript
import { View, Text, YStack, Spinner } from 'tamagui'
import { FlatList } from 'react-native'
import { useQuery } from '@repo/api-client'
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui'
import { formatDisplayDate } from '@repo/shared/utils'

export default function MatchesScreen() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.matches.getAll({ type: 'upcoming' }),
  })

  if (isLoading) {
    return (
      <View flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </View>
    )
  }

  return (
    <YStack flex={1} padding="$4">
      <Text fontSize="$8" fontWeight="bold" marginBottom="$4">
        Upcoming Matches
      </Text>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card marginBottom="$3">
            <CardHeader>
              <CardTitle>{item.location.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text>{formatDisplayDate(item.date)}</Text>
              <Text>{item.time}</Text>
              <Text>
                {item.currentPlayers} / {item.maxPlayers} players
              </Text>
            </CardContent>
          </Card>
        )}
      />
    </YStack>
  )
}
```

### 7.2 Match Detail Screen

**Create `apps/mobile-web/app/(tabs)/matches/[id].tsx`**:

```typescript
import { useLocalSearchParams } from 'expo-router'
import { View, Text, YStack, Spinner, Button } from 'tamagui'
import { useQuery, useMutation } from '@repo/api-client'
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui'

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams()

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: () => api.matches.getById({ id: id as string }),
  })

  const signupMutation = useMutation({
    mutationFn: () => api.matches.signup.create({ matchId: id as string }),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries(['match', id])
    },
  })

  if (isLoading) {
    return (
      <View flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </View>
    )
  }

  return (
    <YStack flex={1} padding="$4">
      <Card>
        <CardHeader>
          <CardTitle>{match.location.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Text fontSize="$5">{match.date} at {match.time}</Text>
          <Text marginTop="$2">
            Capacity: {match.currentPlayers} / {match.maxPlayers}
          </Text>

          <Button
            marginTop="$4"
            onPress={() => signupMutation.mutate()}
            disabled={signupMutation.isPending || match.isFull}
          >
            {signupMutation.isPending ? 'Signing up...' : 'Sign Up'}
          </Button>
        </CardContent>
      </Card>

      <Text fontSize="$6" fontWeight="bold" marginTop="$4">
        Players
      </Text>
      {match.players.map((player) => (
        <Card key={player.id} marginTop="$2">
          <CardContent>
            <Text>{player.playerName}</Text>
            <Text fontSize="$2" color="$gray10">
              {player.status}
            </Text>
          </CardContent>
        </Card>
      ))}
    </YStack>
  )
}
```

### 7.3 Tab Navigation

**Create `apps/mobile-web/app/(tabs)/_layout.tsx`**:

```typescript
import { Tabs } from 'expo-router'
import { Home, Calendar, User } from '@tamagui/lucide-icons'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color }) => <Calendar color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} />,
        }}
      />
    </Tabs>
  )
}
```

### 7.4 Authentication Setup

**Create `apps/mobile-web/lib/auth.ts`**:

```typescript
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
})

export const {
  signIn,
  signOut,
  useSession,
  signUp
} = authClient
```

**Create `apps/mobile-web/app/(auth)/sign-in.tsx`**:

```typescript
import { View, Button } from 'tamagui'
import { signIn } from '../../lib/auth'
import * as WebBrowser from 'expo-web-browser'

export default function SignInScreen() {
  const handleGoogleSignIn = async () => {
    const result = await WebBrowser.openAuthSessionAsync(
      `${process.env.EXPO_PUBLIC_API_URL}/api/auth/google`,
      'exp://localhost:8081' // Your app's redirect URI
    )

    if (result.type === 'success') {
      // Handle successful auth
    }
  }

  return (
    <View flex={1} justifyContent="center" alignItems="center">
      <Button onPress={handleGoogleSignIn}>
        Sign in with Google
      </Button>
    </View>
  )
}
```

---

## Phase 8: Admin Dashboard

### 8.1 Admin Layout

**Create `apps/mobile-web/app/(admin)/_layout.tsx`**:

```typescript
import { Redirect, Stack } from 'expo-router'
import { useSession } from '../../lib/auth'

export default function AdminLayout() {
  const { data: session } = useSession()

  if (!session?.user || session.user.role !== 'admin') {
    return <Redirect href="/" />
  }

  return <Stack />
}
```

### 8.2 Match Management

**Create `apps/mobile-web/app/(admin)/matches/create.tsx`**:

```typescript
import { useState } from 'react'
import { YStack, Input, Button, Text } from 'tamagui'
import { useMutation } from '@repo/api-client'
import { useRouter } from 'expo-router'

export default function CreateMatchScreen() {
  const router = useRouter()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('10')

  const createMutation = useMutation({
    mutationFn: (data) => api.matches.create(data),
    onSuccess: () => {
      router.back()
    },
  })

  const handleSubmit = () => {
    createMutation.mutate({
      date,
      time,
      maxPlayers: parseInt(maxPlayers),
      locationId: 'location-id', // Get from picker
      courtId: 'court-id', // Get from picker
    })
  }

  return (
    <YStack flex={1} padding="$4" gap="$4">
      <Text fontSize="$8" fontWeight="bold">
        Create Match
      </Text>

      <Input
        placeholder="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />

      <Input
        placeholder="Time (HH:MM)"
        value={time}
        onChangeText={setTime}
      />

      <Input
        placeholder="Max Players"
        value={maxPlayers}
        onChangeText={setMaxPlayers}
        keyboardType="number-pad"
      />

      <Button
        onPress={handleSubmit}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Creating...' : 'Create Match'}
      </Button>
    </YStack>
  )
}
```

---

## Phase 9: Testing & Validation

### 9.1 Test API Locally

```bash
# Terminal 1: Start API
cd apps/api
bun run dev

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/matches
```

### 9.2 Test Expo App

```bash
# Terminal 2: Start Expo
cd apps/mobile-web
pnpm expo start

# Press 'w' for web
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
```

### 9.3 Test oRPC Client

**Create a test file `packages/api-client/test.ts`**:

```typescript
import { api } from './src'

async function test() {
  // Test getting matches
  const matches = await api.matches.getAll({ type: 'upcoming' })
  console.log('Matches:', matches)

  // Test type safety (this should show autocomplete)
  const match = await api.matches.getById({ id: '123' })
  console.log('Match:', match)
}

test()
```

### 9.4 Validation Checklist

**API Backend**:
- [ ] Health check responds
- [ ] Better Auth routes work
- [ ] CORS configured correctly
- [ ] oRPC endpoints respond
- [ ] Database connection works
- [ ] Environment variables loaded

**Expo App**:
- [ ] Web version loads
- [ ] iOS simulator works (if on Mac)
- [ ] Android emulator works
- [ ] Navigation works between screens
- [ ] API calls succeed
- [ ] Authentication flow works
- [ ] Tamagui components render correctly

**Shared Code**:
- [ ] Services work with Hono
- [ ] Repositories connect to database
- [ ] Timezone utilities work
- [ ] Type imports work across packages

---

## Phase 10: Migration Strategies

### 10.1 Gradual Migration

**Option A: Parallel Development**
1. Keep current Next.js app running
2. Build new Expo app alongside
3. Point both to same database
4. Gradually move users to new app

**Option B: Feature Parity First**
1. Build all features in Expo app first
2. Test thoroughly
3. Switch over completely
4. Archive Next.js app

### 10.2 Database Considerations

**Current setup already supports dual storage** (Turso + Google Sheets), so no changes needed to `@repo/shared/repositories`.

**Migration steps**:
1. Ensure API can connect to Turso
2. Test all repository operations
3. Verify data integrity
4. No schema changes required (using same Kysely setup)

### 10.3 Deployment

**API Deployment (Fly.io recommended)**:

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Initialize
cd apps/api
fly launch

# Deploy
fly deploy
```

**Expo Deployment**:

```bash
# Install EAS CLI
pnpm add -g eas-cli

# Configure
cd apps/mobile-web
eas init

# Build for stores
eas build --platform ios
eas build --platform android

# Deploy web
eas build --platform web
```

---

## Phase 11: Environment Configuration

### 11.1 Root .env

**Create `.env` at monorepo root**:

```env
# Shared across all apps
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
DEFAULT_TIMEZONE=Europe/Berlin
```

### 11.2 API .env

**`apps/api/.env`**:

```env
# Inherits from root + API-specific
BETTER_AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006
TRUSTED_ORIGINS=http://localhost:8081
PORT=3001
```

### 11.3 Expo .env

**`apps/mobile-web/.env`**:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...
```

---

## Phase 12: Advanced Features

### 12.1 Calendar Download (Mobile)

**Create `apps/mobile-web/lib/calendar.ts`**:

```typescript
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Match } from '@repo/shared/domain'
import { formatDisplayDateTime } from '@repo/shared/utils'

export async function downloadMatchCalendar(match: Match) {
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${match.location.name}
DTSTART:${formatICSDate(match.date, match.time)}
DTEND:${formatICSDate(match.date, match.time, 90)} // 90min duration
LOCATION:${match.location.address}
DESCRIPTION:Football match with friends
END:VEVENT
END:VCALENDAR`

  const fileUri = FileSystem.documentDirectory + 'match.ics'
  await FileSystem.writeAsStringAsync(fileUri, icsContent)
  await Sharing.shareAsync(fileUri)
}

function formatICSDate(date: string, time: string, addMinutes = 0): string {
  // Implementation similar to current calendar-download.tsx
  // Use @repo/shared/utils timezone functions
}
```

### 12.2 Push Notifications

**Setup notifications** (for future):

```bash
cd apps/mobile-web
pnpm expo install expo-notifications
```

**Create notification service** in `apps/mobile-web/lib/notifications.ts`.

### 12.3 Offline Support

**Setup persistence** with TanStack Query:

```typescript
// In packages/api-client/src/provider.tsx
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import AsyncStorage from '@react-native-async-storage/async-storage'

const persister = createSyncStoragePersister({
  storage: AsyncStorage,
})

// Wrap app with PersistQueryClientProvider
```

---

## Phase 13: Internationalization

### 13.1 Setup i18n for Expo

```bash
cd apps/mobile-web
pnpm add i18next react-i18next expo-localization
```

**Create `apps/mobile-web/lib/i18n.ts`**:

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'

// Import translations from current locales/ folder
import en from '../../../locales/en/common.json'
import es from '../../../locales/es/common.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: Localization.locale.split('-')[0], // 'en' or 'es'
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
```

**Copy translations**: Move `locales/` folder to `apps/mobile-web/locales/`.

---

## Phase 14: Performance Optimization

### 14.1 Code Splitting (Web)

Expo Router automatically code-splits routes for web. No extra config needed.

### 14.2 Image Optimization

```bash
cd apps/mobile-web
pnpm expo install expo-image
```

Use `expo-image` instead of `Image` for better performance.

### 14.3 Bundle Analysis

```bash
cd apps/mobile-web
pnpm expo export --platform web --analyze
```

### 14.4 API Caching

**In `packages/api-client/src/provider.tsx`**, adjust stale times:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
    },
  },
})
```

---

## Phase 15: Final Checklist

### Pre-Launch Validation

**API**:
- [ ] All endpoints tested
- [ ] Authentication working
- [ ] Authorization rules enforced
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Database migrations run
- [ ] Environment variables set
- [ ] CORS configured for production domains
- [ ] Rate limiting added (if needed)
- [ ] API documentation generated

**Mobile App**:
- [ ] All screens implemented
- [ ] Navigation working smoothly
- [ ] Forms validated properly
- [ ] Error states handled
- [ ] Loading states shown
- [ ] Authentication flow complete
- [ ] Deep linking configured
- [ ] App icons and splash screens added
- [ ] App store metadata prepared

**Web App**:
- [ ] SEO meta tags added
- [ ] PWA manifest configured
- [ ] Responsive design tested
- [ ] Performance tested (Lighthouse)
- [ ] Accessibility checked

**Shared Code**:
- [ ] All services unit tested
- [ ] Repository tests passing
- [ ] Type coverage complete
- [ ] No unused imports/code

**DevOps**:
- [ ] CI/CD pipeline configured
- [ ] API deployed to production
- [ ] Expo builds successful
- [ ] Environment variables set in production
- [ ] Monitoring configured (Sentry)
- [ ] Backup strategy in place

---

## Troubleshooting Guide

### Common Issues

**1. Metro bundler can't find packages**
```bash
# Clear cache
cd apps/mobile-web
pnpm expo start --clear
```

**2. TypeScript can't find types**
```bash
# Rebuild project references
pnpm install
pnpm typecheck
```

**3. Bun runtime errors**
```bash
# Check Bun version
bun --version

# Should be 1.0.0+
```

**4. CORS errors**
- Check `ALLOWED_ORIGINS` in API .env
- Ensure credentials: 'include' in API client
- Verify Better Auth `trustedOrigins`

**5. oRPC type errors**
- Restart TypeScript server in IDE
- Check that API types are exported correctly
- Verify `AppRouter` type export

**6. Database connection fails**
- Check Turso credentials
- Test connection with Kysely directly
- Verify `STORAGE_PROVIDER` env var

---

## Next Steps After Migration

### Feature Additions
1. Push notifications for match reminders
2. In-app payments for match fees
3. Photo sharing for matches
4. Player stats and history
5. Match ratings and reviews
6. Weather integration
7. Location services (find nearby courts)

### Technical Improvements
1. Add E2E tests (Detox for mobile)
2. Setup Storybook for component library
3. Add analytics (Mixpanel/Amplitude)
4. Implement feature flags
5. Add A/B testing capability
6. Setup automated screenshots
7. Add performance monitoring

---

## Reference Links

**Documentation**:
- [Turborepo Docs](https://turbo.build/repo/docs)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [Hono Docs](https://hono.dev/)
- [oRPC Docs](https://orpc.dev/)
- [Tamagui Docs](https://tamagui.dev/)
- [Better Auth Docs](https://www.better-auth.com/)

**Key Files to Reference**:
- Current `lib/services/match-service.ts` - Business logic patterns
- Current `lib/repositories/turso/match-repository.ts` - Data access patterns
- Current `lib/utils/timezone.ts` - Timezone handling
- Current `app/api/matches/route.ts` - API structure to replicate

---

## Notes for Future Self

**Remember**:
- Timezone handling is critical - always use `convertToAppTimezone()` from `@repo/shared/utils`
- The service layer is already well-structured - just wire it to Hono
- Repository pattern supports dual storage - don't break that abstraction
- Better Auth session handling needs careful attention in mobile context
- oRPC provides full type safety - leverage it everywhere
- Tamagui's `Adapt` primitive is powerful for responsive UI
- Expo EAS handles builds - don't try to build locally
- Keep shared code truly shared - no platform-specific code in `@repo/shared`

**Don't forget**:
- Add proper error boundaries
- Implement retry logic for failed requests
- Add loading skeletons for better UX
- Test on real devices, not just simulators
- iOS requires different OAuth redirect handling than Android
- Web needs special consideration for SEO on public pages
- Calendar export format is specific - test with different calendar apps
