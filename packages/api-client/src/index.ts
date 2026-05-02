// Export the Hono RPC client
export { api, client, configureGeneralApiClient, configureLanguage } from "./client";

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
  configureWebAppUrl,
  getWebAppUrl,
  storeBearerToken,
  clearBearerToken,
  getBearerToken,
  signUpWithPhone,
  signInWithPhone,
  needsPasswordReset,
  resetPasswordForMigration,
  requestPasswordReset,
  resetPasswordWithCode,
  getAdminResetCodes,
  deleteAccount,
} from "./auth";
export type { Session, User, PhoneSignUpData, PhoneSignInData } from "./auth";

// Active group storage — consumed by the client fetch interceptor and
// exposed for the mobile-web switcher (Phase 2).
export { getActiveGroupId, setActiveGroupId, GROUP_HEADER } from "./group-storage";

// Group-management React Query hooks (Phase 2).
export {
  groupQueryKeys,
  useMyGroups,
  useCurrentGroup,
  useGroupDetail,
  useGroupMembers,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useUpdateMemberRole,
  useKickMember,
  useLeaveGroup,
  useTransferOwnership,
  useGroupInvites,
  useCreateInvite,
  useRevokeInvite,
  useInvitePreview,
  useAcceptInvite,
  useGroupRoster,
  useCreateRosterEntry,
  useUpdateRosterEntry,
  useDeleteRosterEntry,
  useCopyVenues,
} from "./groups";
export type {
  GroupInviteSummary,
  GroupInvitePreviewResult,
  GroupRosterEntry,
  CreateRosterInput,
  UpdateRosterInput,
  GroupMemberSummary,
  GroupDetailPayload,
  MyGroupSummary,
} from "./groups";

export {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  notificationPreferencesQueryKeys,
} from "./notification-preferences";
export type { NotificationPreferences, NotificationPreferencesUpdate } from "@repo/shared/domain";

// Notifications inbox (group-scoped) — list + unread badge + mark read
export {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  notificationInboxQueryKeys,
} from "./notifications-inbox";
export type { InboxNotification, InboxPage } from "./notifications-inbox";

// Re-export the API routes type for convenience
export type { ApiRoutes } from "../../../apps/api/src/index";
