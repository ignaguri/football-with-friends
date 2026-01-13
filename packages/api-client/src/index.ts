// Export the oRPC client
export { orpcClient, api } from './client'

// Export React Query hooks
export {
  orpc,
  useQuery,
  useMutation,
  useInfiniteQuery,
  useSuspenseQuery,
  useQueries,
  useSuspenseInfiniteQuery,
} from './hooks'

// Export types
export type { QueryKey, MutationKey } from './hooks'

// Export provider (also available via import from '@repo/api-client/provider')
export { APIProvider, createQueryClient } from './provider'

// Re-export the AppRouter type for convenience
export type { AppRouter } from '../../../apps/api/src/orpc'
