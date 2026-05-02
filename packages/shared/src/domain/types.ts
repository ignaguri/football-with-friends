// Domain types for the football match application

// Player status types for match participation
export const PLAYER_STATUSES = ["PAID", "PENDING", "CANCELLED", "SUBSTITUTE"] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

// Signup types to track how a player was added
export const SIGNUP_TYPES = ["self", "guest", "admin_added", "invitation"] as const;
export type SignupType = (typeof SIGNUP_TYPES)[number];

// Match status types
export const MATCH_STATUSES = ["upcoming", "cancelled", "completed"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

// App settings types
export interface AppSettings {
  default_cost_per_player: string;
  same_day_extra_cost: string;
  default_max_substitutes: string;
  paypal_url: string;
  organizer_whatsapp: string;
}

export type SettingKey = keyof AppSettings;

export const DEFAULT_SETTINGS: AppSettings = {
  default_cost_per_player: "10",
  same_day_extra_cost: "2",
  default_max_substitutes: "2",
  paypal_url: "",
  organizer_whatsapp: "",
};

// Core domain entities

export interface Location {
  id: string;
  groupId: string;
  name: string;
  address?: string;
  coordinates?: string;
  courtCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Court {
  id: string;
  groupId: string;
  locationId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Populated fields (from joins)
  location?: Location;
}

export interface Match {
  id: string;
  groupId: string;
  locationId: string;
  courtId?: string;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:MM format
  status: MatchStatus;
  maxPlayers: number;
  maxSubstitutes: number;
  costPerPlayer?: string;
  sameDayCost?: string;
  createdByUserId: string;
  votingClosedAt: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Populated fields (from joins)
  location?: Location;
  court?: Court;
  signups?: Signup[];
  createdByUser?: User;
}

export interface Signup {
  id: string;
  groupId: string;
  matchId: string;
  userId?: string; // nullable for guests
  playerName: string;
  playerEmail: string;
  status: PlayerStatus;
  signupType: SignupType;
  guestOwnerId?: string; // for guest signups
  rosterId?: string; // points to group_roster; supplants guest_owner_id
  addedByUserId: string; // tracks who added this signup
  signedUpAt: Date;
  updatedAt: Date;

  // Populated fields (from joins)
  user?: User;
  guestOwner?: User;
  addedByUser?: User;
  guestOwnerEmail?: string; // populated from join
  playerNationality?: string; // populated from join with user table
  playerUsername?: string | null; // from join with user table
  playerDisplayUsername?: string | null; // from join with user table
}

export interface MatchInvitation {
  id: string;
  matchId: string;
  email: string;
  invitedByUserId: string;
  status: "pending" | "accepted" | "declined";
  invitedAt: Date;
  respondedAt?: Date;

  // Populated fields (from joins)
  match?: Match;
  invitedByUser?: User;
}

// User type from BetterAuth (extended).
// Platform-level role: 'user' (default) or 'admin' (platform admin — only
// Ignacio today). 'admin' here is the cross-group escape hatch; the
// group-level role "organizer" (on group_members) is a separate concept.
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: "user" | "admin";
  nationality?: string; // ISO 3166-1 alpha-2 country code (e.g., "US", "AR", "DE")
  username?: string | null;
  displayUsername?: string | null;
  primaryAuthMethod?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Player stats for a specific match
export interface MatchPlayerStats {
  id: string;
  groupId: string;
  matchId: string;
  userId: string;
  goals: number;
  thirdTimeAttended: boolean;
  thirdTimeBeers: number;
  confirmed: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Populated fields
  user?: User;
  match?: Match;
}

// Aggregated player statistics across all matches
export interface PlayerProfile {
  user: User;
  totalMatchesPlayed: number;
  totalGoals: number;
  totalThirdTimeAttendances: number;
  totalBeers: number;
  matchStats: MatchPlayerStats[];
}

// Player summary for the players list
export interface PlayerSummary {
  userId: string;
  userName: string;
  userNickname?: string | null;
  userEmail: string;
  nationality?: string;
  profilePicture?: string;
  totalMatches: number;
  totalGoals: number;
  totalThirdTimes: number;
}

// Ranking types for player leaderboards

export type RankingCriteria = "matches" | "third_times" | "beers" | "total_votes";

export interface PlayerRanking {
  rank: number;
  userId: string;
  userName: string;
  userNickname?: string | null;
  userEmail: string;
  nationality?: string;
  profilePicture?: string;
  value: number;
}

export interface PlayerVotingStats {
  userId: string;
  totalVotesReceived: number;
  criteriaBreakdown: Array<{
    criteriaId: string;
    criteriaCode: string;
    criteriaName: string;
    timesVoted: number;
    rank?: number;
  }>;
}

export interface VotingLeaderboard {
  criteria: Array<{
    criteriaId: string;
    criteriaCode: string;
    criteriaName: string;
    criteriaDescription: string;
    topPlayers: Array<{
      userId: string;
      userName: string;
      userNickname?: string | null;
      nationality?: string;
      profilePicture?: string;
      voteCount: number;
    }>;
  }>;
}

// Data transfer objects (DTOs) for creating/updating entities

export interface CreateLocationData {
  groupId: string;
  name: string;
  address?: string;
  coordinates?: string;
  courtCount?: number;
}

export interface UpdateLocationData extends Partial<Omit<CreateLocationData, "groupId">> {}

export interface CreateCourtData {
  groupId: string;
  locationId: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCourtData extends Partial<Omit<CreateCourtData, "groupId">> {}

export interface CreateMatchData {
  groupId: string;
  locationId: string;
  courtId?: string;
  date: string;
  time: string;
  maxPlayers?: number;
  maxSubstitutes?: number;
  costPerPlayer?: string;
  sameDayCost?: string;
  createdByUserId: string;
}

export interface UpdateMatchData extends Partial<
  Omit<CreateMatchData, "createdByUserId" | "groupId">
> {
  status?: MatchStatus;
}

export interface CreateSignupData {
  groupId: string;
  matchId: string;
  userId?: string;
  playerName: string;
  playerEmail: string;
  status?: PlayerStatus;
  signupType: SignupType;
  guestOwnerId?: string;
  rosterId?: string;
  addedByUserId: string;
}

export interface UpdateSignupData extends Partial<
  Omit<CreateSignupData, "matchId" | "addedByUserId" | "groupId">
> {}

export interface CreateGuestSignupData {
  groupId: string;
  matchId: string;
  // Every guest signup is backed by a roster entry: `rosterId` is the
  // identity source; `guestName` is the display snapshot at signup time.
  rosterId: string;
  guestName: string;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  status?: PlayerStatus;
}

export interface CreateInvitationData {
  matchId: string;
  email: string;
  invitedByUserId: string;
}

export interface CreateMatchPlayerStatsData {
  groupId: string;
  matchId: string;
  userId: string;
  goals?: number;
  thirdTimeAttended?: boolean;
  thirdTimeBeers?: number;
}

export interface UpdateMatchPlayerStatsData {
  goals?: number;
  thirdTimeAttended?: boolean;
  thirdTimeBeers?: number;
  confirmed?: boolean;
}

// Filter and query types

export interface MatchFilters {
  groupId?: string; // scope-by-group filter; required on all request-driven list calls
  status?: MatchStatus;
  type?: "past" | "upcoming";
  userId?: string; // matches where user is signed up
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortDirection?: "asc" | "desc";
}

export interface SignupFilters {
  groupId?: string;
  matchId?: string;
  userId?: string;
  status?: PlayerStatus;
  signupType?: SignupType;
}

// Player self-service types

export interface FinishedMatchForUser {
  matchId: string;
  date: string;
  time: string;
  locationName: string;
  courtName?: string;
  wasSignedUp: boolean;
  existingStats: {
    goals: number;
    thirdTimeAttended: boolean;
    thirdTimeBeers: number;
  } | null;
}

// Voting criteria types
export interface VotingCriteria {
  id: string;
  code: string;
  nameEn: string;
  nameEs: string;
  descriptionEn?: string;
  descriptionEs?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Match vote for a specific player
export interface MatchVote {
  id: string;
  matchId: string;
  voterUserId: string;
  criteriaId: string;
  votedForUserId: string;
  createdAt: Date;
  updatedAt: Date;

  // Populated fields
  criteria?: VotingCriteria;
  votedForUser?: User;
  voterUser?: User;
}

// Vote submission data
export interface CreateVoteData {
  matchId: string;
  voterUserId: string;
  criteriaId: string;
  votedForUserId: string;
}

// Localized voting criteria (for API responses)
export interface LocalizedVotingCriteria {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

// User's votes for a match
export interface UserMatchVotes {
  matchId: string;
  voterUserId: string;
  votes: {
    criteriaId: string;
    votedForUserId: string;
  }[];
}

// Vote results for a criteria
export interface CriteriaVoteResult {
  criteriaId: string;
  criteriaCode: string;
  criteriaName: string;
  votedForUserId: string;
  votedForUserName: string;
  voteCount: number;
}

// Match voting results
export interface MatchVotingResults {
  matchId: string;
  totalVoters: number;
  results: CriteriaVoteResult[];
}

export interface MatchPlayerSocialStat {
  userId: string;
  userName: string;
  thirdTimeAttended: boolean;
  thirdTimeBeers: number;
}

// `results` and `playerStats` are empty arrays while voting is open, populated
// once it closes (manually by an organizer or auto-closes 7 days after match.date).
export interface MatchStats {
  matchId: string;
  isVotingClosed: boolean;
  votingAutoCloseAt: string;
  votingClosedAt: string | null;
  totalVoters: number;
  eligibleVoterCount: number;
  results: CriteriaVoteResult[];
  playerStats: MatchPlayerSocialStat[];
}

// Rich domain objects for API responses

export interface MatchDetails extends Match {
  location: Location;
  court?: Court;
  signups: Signup[];
  createdByUser: User;
  availableSpots: number;
  isUserSignedUp?: boolean;
  userSignup?: Signup;
}

export interface SignupWithDetails extends Signup {
  match: Match;
  user?: User;
  guestOwner?: User;
  addedByUser: User;
}

// Legacy types (for backward compatibility during migration)

export interface MatchMetadata {
  matchId: string;
  sheetName: string;
  sheetGid: string;
  date: string;
  time: string;
  courtNumber: string;
  status: string;
  costCourt: string;
  costShirts: string;
}

// API Error handling types
export const API_ERROR_KEYS = [
  "duplicateDate",
  "missingFields",
  "invalidInput",
  "unauthorizedApi",
  "noMatchId",
  "matchFull",
  "alreadySignedUp",
  "unknownError",
] as const;

export type ApiErrorKey = (typeof API_ERROR_KEYS)[number];

export function isApiErrorKey(key: string): key is ApiErrorKey {
  return API_ERROR_KEYS.includes(key as ApiErrorKey);
}

// Push notification types

export const PUSH_TOKEN_PLATFORMS = ["ios", "android"] as const;
export type PushTokenPlatform = (typeof PUSH_TOKEN_PLATFORMS)[number];

export interface PushTokenInfo {
  id: string;
  userId: string;
  token: string;
  platform: PushTokenPlatform;
  deviceId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterPushTokenData {
  userId: string;
  token: string;
  platform: PushTokenPlatform;
  deviceId?: string;
}

export interface ExpoPushMessage {
  to: string;
  title?: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

export interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: "DeviceNotRegistered" | "InvalidCredentials" | "MessageTooBig" | "MessageRateExceeded";
  };
}

export interface ExpoPushReceipt {
  status: "ok" | "error";
  message?: string;
  details?: {
    error?: "DeviceNotRegistered" | "InvalidCredentials" | "MessageTooBig" | "MessageRateExceeded";
  };
}

export interface NotificationPayload {
  title?: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationMatchInfo {
  id: string;
  date: string;
  time: string;
  locationName?: string;
}

export const NOTIFICATION_TYPES = {
  MATCH_CREATED: "match_created",
  MATCH_UPDATED: "match_updated",
  MATCH_CANCELLED: "match_cancelled",
  PLAYER_CONFIRMED: "player_confirmed",
  SUBSTITUTE_PROMOTED: "substitute_promoted",
  PLAYER_CANCELLED: "player_cancelled",
  REMOVED_FROM_MATCH: "removed_from_match",
  MATCH_REMINDER: "match_reminder",
  PAYMENT_REMINDER: "payment_reminder",
  VOTING_OPEN: "voting_open",
  ENGAGEMENT_REMINDER: "engagement_reminder",
  GROUP_INVITE: "group_invite",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// Per-user opt-in/opt-out categories (subset of NOTIFICATION_TYPES that map
// to a column in user_notification_prefs). Sends without a category bypass
// the per-category filter and only respect the master push_enabled flag.
export const NOTIFICATION_CATEGORIES = [
  "new_match",
  "match_reminder",
  "promo_to_confirmed",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const CATEGORY_TO_COLUMN: Record<
  NotificationCategory,
  "push_new_match" | "push_match_reminder" | "push_promo_to_confirmed"
> = {
  new_match: "push_new_match",
  match_reminder: "push_match_reminder",
  promo_to_confirmed: "push_promo_to_confirmed",
};

export interface NotificationPreferences {
  pushEnabled: boolean;
  pushNewMatch: boolean;
  pushMatchReminder: boolean;
  pushPromoToConfirmed: boolean;
}

export type NotificationPreferencesUpdate = Partial<NotificationPreferences>;

export const NOTIFICATION_PREF_TO_COLUMN: Record<
  keyof NotificationPreferences,
  "push_enabled" | "push_new_match" | "push_match_reminder" | "push_promo_to_confirmed"
> = {
  pushEnabled: "push_enabled",
  pushNewMatch: "push_new_match",
  pushMatchReminder: "push_match_reminder",
  pushPromoToConfirmed: "push_promo_to_confirmed",
};

// Inbox row — persisted record of a notification we sent (or would have sent
// if the user had push enabled). Group-scoped so an active-group switch
// changes which rows are visible. `data` mirrors the push payload's `data`
// field so deep-link handling is the same on tap.
export interface InboxNotification {
  id: string;
  userId: string;
  groupId: string;
  type: NotificationType;
  category: NotificationCategory | null;
  title: string | null;
  body: string;
  data: NotificationPayload["data"];
  readAt: string | null;
  createdAt: string;
}

// Helper types for pagination and responses

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

// --- Match media ---

export const MEDIA_KINDS = ["photo", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const REACTION_EMOJIS = ["❤️", "🔥", "⚽", "😂", "🍺"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type MatchMediaReactionSummary = {
  emoji: ReactionEmoji;
  count: number;
  didReact: boolean;
};

export type MatchMedia = {
  id: string;
  matchId: string;
  uploaderUserId: string;
  uploaderName: string;
  kind: MediaKind;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  url: string;
  posterUrl: string | null;
  createdAt: string; // ISO-8601
  reactions: MatchMediaReactionSummary[];
};

export type MatchMediaFeedGroup = {
  matchId: string;
  matchDate: string; // ISO date
  fieldName: string | null;
  items: MatchMedia[];
  totalCount: number; // total items in this match; can be > items.length
};

// --- Groups (multi-tenant scoping) ---
// See docs/superpowers/specs/2026-04-22-group-oriented-scoping-design.md.
// Scoping is introduced in Phase 0 (tables + nullable columns) and activated
// in Phase 1 (backfill + middleware). These types describe the target shape.

export const MEMBER_ROLES = ["organizer", "member"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

// Platform-level role on the `user` table. Two values:
//   - "user" (default)
//   - "admin" (platform admin — Ignacio — cross-group escape hatch)
// Group-level authority is a separate concept on group_members.role
// ("organizer" / "member"). Do not conflate.
export const PLATFORM_ROLES = ["user", "admin"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

// HTTP header carrying the active group id across every authed request.
export const GROUP_HEADER = "X-Group-Id";

export const GROUP_VISIBILITIES = ["private", "public"] as const;
export type GroupVisibility = (typeof GROUP_VISIBILITIES)[number];

export interface Group {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  visibility: GroupVisibility;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Populated fields (from joins)
  owner?: User;
  memberCount?: number;
  myRole?: MemberRole;
  amIOwner?: boolean;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;

  // Populated fields
  user?: User;
}

// Members enriched with the user fields needed to render a readable row
// (name + secondary contact). Kept flat rather than nested `user?: User` so
// callers don't have to thread a User type that doesn't surface `phoneNumber`.
export interface GroupMemberWithUser extends GroupMember {
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  username: string | null;
  displayUsername: string | null;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  token: string;
  createdByUserId: string;
  expiresAt?: Date;
  maxUses?: number;
  usesCount: number;
  targetPhone?: string;
  targetUserId?: string;
  revokedAt?: Date;
  createdAt: Date;

  // Populated fields
  group?: Group;
  createdByUser?: User;
}

export type GroupInviteInvalidReason =
  | "expired"
  | "revoked"
  | "exhausted"
  | "target_mismatch"
  | "not_found";

export interface GroupInvitePreview {
  valid: boolean;
  reason?: GroupInviteInvalidReason;
  group?: {
    id: string;
    name: string;
  };
  inviter?: {
    id: string;
    name: string;
  };
  expiresAt?: Date;
}

export interface GroupRoster {
  id: string;
  groupId: string;
  displayName: string;
  phone?: string;
  email?: string;
  claimedByUserId?: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;

  // Populated fields
  claimedByUser?: User;
  createdByUser?: User;
}

// DTOs

export interface CreateGroupData {
  name: string;
  slug?: string; // auto-derived from name if omitted
  ownerUserId: string;
  visibility?: GroupVisibility;
}

export interface UpdateGroupData {
  name?: string;
  slug?: string;
  visibility?: GroupVisibility;
}

export interface CreateGroupInviteData {
  groupId: string;
  createdByUserId: string;
  expiresAt?: Date;
  maxUses?: number;
  targetPhone?: string;
  targetUserId?: string;
}

export interface CreateGroupRosterData {
  groupId: string;
  displayName: string;
  phone?: string;
  email?: string;
  createdByUserId: string;
}

export interface UpdateGroupRosterData {
  displayName?: string;
  // Nullable so organizers can clear contact info — the repo distinguishes
  // `undefined` ("don't touch") from `null` ("set to NULL").
  phone?: string | null;
  email?: string | null;
  claimedByUserId?: string | null;
}

export interface GroupMemberFilters {
  groupId: string;
  role?: MemberRole;
}

export interface GroupRosterFilters {
  groupId: string;
  claimed?: boolean;
}
