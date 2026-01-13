// Export the oRPC client
export { api, orpcClient } from "./client";

// Export React Query hooks
export {
  orpc,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "./hooks";

// Export types
export type { MutationKey, QueryKey } from "./hooks";

// Export provider (also available via import from '@repo/api-client/provider')
export { APIProvider, createQueryClient } from "./provider";

// Re-export the AppRouter type for convenience
export type { AppRouter } from "../../../apps/api/src/orpc";
