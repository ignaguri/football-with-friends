# @repo/api-client

Type-safe API client for Football with Friends, built on the **Hono RPC client** (`hc`) and TanStack React Query.

> **Note:** The API uses Hono RPC, not oRPC. Endpoints are plain Hono routes under `apps/api/src/routes/*`, registered in `apps/api/src/api-routes.ts`. The `ApiRoutes` type is re-exported from `apps/api/src/index.ts` and gives the client end-to-end type safety. There is no `orpc` export.

## Features

- 🔒 **End-to-end type safety** - `ApiRoutes` flows from the Hono app into the client
- ⚡ **React Query integration** - hooks re-exported from `@tanstack/react-query`
- 🔑 **Auth built in** - BetterAuth client plus phone/password helpers and bearer-token storage
- 📱 **Universal** - works on web and mobile (Expo); the API base URL resolves at request time

## Installation

Part of the monorepo, available via workspace reference:

```json
{
  "dependencies": {
    "@repo/api-client": "workspace:*"
  }
}
```

## Usage

### Setup Provider

Wrap your app with `APIProvider` to enable React Query:

```tsx
import { APIProvider } from "@repo/api-client";

function App() {
  return (
    <APIProvider>
      <YourApp />
    </APIProvider>
  );
}
```

### Configure the API URL and language

Call these early in app init (e.g. `_layout.tsx`). Without a configured URL the client falls back to `http://localhost:3001`.

```ts
import { configureGeneralApiClient, configureLanguage } from "@repo/api-client";

configureGeneralApiClient(process.env.EXPO_PUBLIC_API_URL);
configureLanguage("es"); // sets the Accept-Language header on every request
```

### Calling endpoints

`client` (also exported as `api`) is the Hono RPC client. Call a route method (`$get`, `$post`, `$delete`, …), then `.json()` the `Response`. Wrap it in React Query yourself. Query params are passed as strings under `query`.

```tsx
import { client, useInfiniteQuery } from "@repo/api-client";

function MatchList() {
  const { data } = useInfiniteQuery({
    queryKey: ["matches", "upcoming"],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await client.api.matches.$get({
        query: { type: "upcoming", limit: "5", offset: String(pageParam) },
      });
      return res.json();
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? (lastPage.page + 1) * 5 : undefined),
    initialPageParam: 0,
  });

  const matches = data?.pages.flatMap((page) => page.matches) ?? [];
  return <>{/* … */}</>;
}
```

Mutations follow the same shape with `useMutation`:

```tsx
import { client, useMutation, useQueryClient } from "@repo/api-client";

function useSignup(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await client.api.matches[":id"].signup.$post({
        param: { id: matchId },
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matches"] }),
  });
}
```

The custom fetch throws on non-OK responses (so React Query treats them as errors), injects the bearer token and the active-group header (`X-Group-Id`), and sets `credentials`/`Accept-Language`. See `src/client.ts`.

### Error handling

Thrown errors carry the response details:

```ts
try {
  const res = await client.api.matches.$get({ query: { type: "upcoming" } });
  return res.json();
} catch (err) {
  const e = err as Error & { status: number; data: unknown };
  console.error(e.status, e.data);
}
```

## Exports

Beyond the raw `client`/`api`, the package ships ready-made hooks so most feature code never touches `client` directly:

- **React Query re-exports** - `useQuery`, `useMutation`, `useInfiniteQuery`, `useQueries`, `useSuspenseQuery`, `useSuspenseInfiniteQuery`, `useQueryClient`
- **Provider** - `APIProvider`, `createQueryClient` (also at `@repo/api-client/provider`)
- **Auth** - `authClient`, `useSession`, `signIn`/`signOut`/`signUp`, `signInWithPhone`/`signUpWithPhone`, `requestPasswordReset`, `resetPasswordWithCode`, `getAdminResetCodes`, bearer-token helpers, `deleteAccount`
- **Active group** - `getActiveGroupId`, `setActiveGroupId`, `GROUP_HEADER`
- **Groups** - `useMyGroups`, `useGroupDetail`, `useGroupMembers`, invite/roster/member-role hooks, group-creation-request hooks, and group-search/join-request hooks
- **Notifications** - `useNotifications`, `useUnreadNotificationCount`, mark-read hooks, and notification-preference hooks
- **Matches** - `useAssignMatchOrganizer`, `useClearMatchOrganizer`, `canManageMatch`

See `src/index.ts` for the full export list and accompanying types.

## Environment Variables

The API base URL resolves at request time from, in order:

1. The value passed to `configureGeneralApiClient(...)`
2. `EXPO_PUBLIC_API_URL`
3. Fallback: `http://localhost:3001`

## Custom Query Client

```tsx
import { createQueryClient } from "@repo/api-client";
import { QueryClientProvider } from "@tanstack/react-query";

const queryClient = createQueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```
