import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import type { ReactNode } from "react";

interface APIProviderProps {
  children: ReactNode;
}

/**
 * API Provider component that sets up React Query
 * Wrap your app with this component to enable oRPC hooks
 */
export function APIProvider({ children }: APIProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/**
 * Create a custom query client with specific options
 * Useful for testing or custom configurations
 */
export function createQueryClient(
  options?: ConstructorParameters<typeof QueryClient>[0],
) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
      ...options?.defaultOptions,
    },
  });
}
