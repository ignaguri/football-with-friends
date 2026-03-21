// Export the Hono RPC client
export { api, client, configureGeneralApiClient } from "./client";

// Export React Query hooks
export {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
  useQueryClient,
} from "./hooks";

// Export provider (also available via import from '@repo/api-client/provider')
export { APIProvider, createQueryClient } from "./provider";

// Export auth client and methods
export {
  authClient,
  signUp,
  signIn,
  signOut,
  useSession,
  getSession,
  configureApiClient,
  getConfiguredApiUrl,
  storeBearerToken,
  clearBearerToken,
  getBearerToken,
  signUpWithPhone,
  signInWithPhone,
  needsPasswordReset,
  resetPasswordForMigration,
} from "./auth";
export type { Session, User, PhoneSignUpData, PhoneSignInData } from "./auth";

// Re-export the API routes type for convenience
export type { ApiRoutes } from "../../../apps/api/src/index";
