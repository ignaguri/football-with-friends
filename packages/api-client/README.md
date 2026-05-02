# @repo/api-client

Type-safe API client for Football with Friends using oRPC and React Query.

## Features

- 🔒 **End-to-end type safety** - Full TypeScript support from API to client
- ⚡ **React Query integration** - Automatic caching, refetching, and state management
- 🎯 **oRPC procedures** - Type-safe RPC calls with automatic validation
- 📱 **Universal** - Works on both web (Next.js) and mobile (Expo)

## Installation

This package is part of the monorepo and is automatically available via workspace references.

```json
{
  "dependencies": {
    "@repo/api-client": "workspace:*"
  }
}
```

## Usage

### Setup Provider

Wrap your app with the `APIProvider` to enable React Query:

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

### Using Hooks

#### Query Data

```tsx
import { orpc } from "@repo/api-client";

function MatchList() {
  const { data, isLoading, error } = orpc.matches.getAll.useQuery({
    input: { type: "upcoming" },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map((match) => (
        <li key={match.id}>{match.location.name}</li>
      ))}
    </ul>
  );
}
```

#### Mutations

```tsx
import { orpc } from "@repo/api-client";

function SignupButton({ matchId }: { matchId: string }) {
  const mutation = orpc.matches.signup.create.useMutation();

  const handleSignup = () => {
    mutation.mutate({
      input: {
        matchId,
        isGuest: false,
      },
    });
  };

  return (
    <button onClick={handleSignup} disabled={mutation.isPending}>
      {mutation.isPending ? "Signing up..." : "Sign Up"}
    </button>
  );
}
```

### Direct API Calls

For non-React contexts, use the client directly:

```ts
import { api } from "@repo/api-client";

// Get matches
const matches = await api.matches.getAll({ type: "upcoming" });

// Create a match (admin only)
const newMatch = await api.matches.create({
  locationId: "loc_123",
  date: "2025-01-20",
  time: "19:00",
  maxPlayers: 10,
});
```

## Available Procedures

### Matches

```ts
orpc.matches.getAll.useQuery({ input: { type } })
orpc.matches.getById.useQuery({ input: { id, userId? } })
orpc.matches.create.useMutation()
orpc.matches.update.useMutation()
orpc.matches.delete.useMutation()

// Signup operations
orpc.matches.signup.create.useMutation()
orpc.matches.signup.updateStatus.useMutation()
orpc.matches.signup.remove.useMutation()
orpc.matches.signup.addPlayer.useMutation()
```

### Courts

```ts
orpc.courts.getAll.useQuery({ input: { locationId? } })
orpc.courts.getById.useQuery({ input: { id } })
orpc.courts.create.useMutation()
orpc.courts.update.useMutation()
orpc.courts.delete.useMutation()
```

### Locations

```ts
orpc.locations.getAll.useQuery();
orpc.locations.getById.useQuery({ input: { id } });
orpc.locations.create.useMutation();
orpc.locations.update.useMutation();
orpc.locations.delete.useMutation();
```

## Environment Variables

The client automatically detects the API URL from:

- `EXPO_PUBLIC_API_URL` (for Expo/React Native)
- `NEXT_PUBLIC_API_URL` (for Next.js)
- Falls back to `http://localhost:3001`

## Configuration

### Custom Query Client

```tsx
import { createQueryClient, QueryClientProvider } from "@repo/api-client";

const queryClient = createQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

### Custom Fetch Options

The client automatically includes credentials and sets proper headers. To customize:

```ts
import { createORPCClient } from "@orpc/client";
import type { AppRouter } from "@repo/api-client";

const customClient = createORPCClient<AppRouter>({
  baseURL: "https://your-api.com/rpc",
  fetch: (input, init) => {
    return fetch(input, {
      ...init,
      credentials: "include",
      headers: {
        ...init?.headers,
        "X-Custom-Header": "value",
      },
    });
  },
});
```

## Type Safety

All procedures are fully typed, including inputs and outputs:

```tsx
// TypeScript knows the exact shape of the input and response
const { data } = orpc.matches.getAll.useQuery({
  input: {
    type: "upcoming", // ✅ Type-checked
    // type: 'invalid' // ❌ TypeScript error
  },
});

// data is typed as Match[]
data.forEach((match) => {
  console.log(match.location.name); // ✅ Fully typed
});
```

## Error Handling

```tsx
const { data, error, isError } = orpc.matches.getAll.useQuery({
  input: { type: "upcoming" },
});

if (isError) {
  // error is typed as ORPCError
  console.error("Code:", error.code);
  console.error("Message:", error.message);
}
```

## Testing

```tsx
import { createQueryClient } from "@repo/api-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

function renderWithClient(component: React.ReactElement) {
  const queryClient = createQueryClient();

  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
}
```
