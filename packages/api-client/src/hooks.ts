import { createORPCReact } from '@orpc/react'
import type { AppRouter } from '../../../apps/api/src/orpc'
import { orpcClient } from './client'

// Create React Query hooks with full type safety
export const orpc = createORPCReact<AppRouter>({
  client: orpcClient,
})

// Export convenience hooks
export const {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useSuspenseQuery,
  useQueries,
  useSuspenseInfiniteQuery,
} = orpc

// Type-safe query and mutation helpers
export type QueryKey = Parameters<typeof useQuery>[0]
export type MutationKey = Parameters<typeof useMutation>[0]
