// Database schema types for Kysely

import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

// Table interfaces

export interface LocationsTable {
  id: Generated<string>;
  name: string;
  address: string | null;
  coordinates: string | null;
  court_count: number;
  group_id: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface MatchesTable {
  id: Generated<string>;
  location_id: string;
  court_id: string | null;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  status: "upcoming" | "cancelled" | "completed";
  max_players: number;
  max_substitutes: number;
  cost_per_player: string | null;
  same_day_cost: string | null;
  created_by_user_id: string;
  reminder_sent: Generated<number>;
  // Group scoping — nullable through Phase 0, backfilled and tightened to NOT NULL in Phase 1.
  group_id: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface SignupsTable {
  id: Generated<string>;
  match_id: string;
  user_id: string | null; // nullable for guests
  player_name: string;
  player_email: string;
  status: "PAID" | "PENDING" | "CANCELLED" | "SUBSTITUTE";
  signup_type: "self" | "guest" | "admin_added" | "invitation";
  guest_owner_id: string | null; // for guest signups (legacy; supplanted by roster_id)
  added_by_user_id: string;
  group_id: string | null;
  roster_id: string | null; // points to group_roster; replaces guest_owner_id long-term
  signed_up_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface CourtsTable {
  id: Generated<string>;
  location_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  group_id: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface MatchInvitationsTable {
  id: Generated<string>;
  match_id: string;
  email: string;
  invited_by_user_id: string;
  status: "pending" | "accepted" | "declined";
  invited_at: ColumnType<Date, string | undefined, never>;
  responded_at: ColumnType<Date, string | undefined, string> | null;
}

export interface UserTable {
  id: string;
  name: string | null;
  email: string;
  emailVerified: number;
  image: string | null;
  role: string;
  banned: number | null;
  banReason: string | null;
  banExpires: string | null;
  createdAt: number;
  updatedAt: number;
  // Auth enhancement fields
  username: string | null;
  displayUsername: string | null;
  profilePicture: string | null;
  nationality: string | null;
  // Phone authentication fields
  phoneNumber: string | null;
  phoneNumberVerified: number;
  // Auth method tracking
  primaryAuthMethod: string | null;
  // Notification tracking
  lastEngagementReminderAt: string | null;
}

export interface VotingCriteriaTable {
  id: Generated<string>;
  code: string;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  is_active: number; // 0 or 1 (SQLite boolean)
  sort_order: number;
  group_id: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface MatchVotesTable {
  id: Generated<string>;
  match_id: string;
  voter_user_id: string;
  criteria_id: string;
  voted_for_user_id: string;
  group_id: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

// Better Auth account table (OAuth providers and credentials)
export interface AccountTable {
  id: string;
  userId: string;
  accountId: string;
  providerId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: number | null;
  refreshTokenExpiresAt: number | null;
  scope: string | null;
  password: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SettingsTable {
  key: string;
  value: string;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface MatchPlayerStatsTable {
  id: Generated<string>;
  match_id: string;
  user_id: string;
  goals: number;
  third_time_attended: number; // 0 or 1 (SQLite boolean)
  third_time_beers: number;
  confirmed: number; // 0 or 1 (SQLite boolean)
  group_id: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface MatchMediaTable {
  id: string;
  match_id: string;
  uploader_user_id: string;
  kind: "photo" | "video";
  mime_type: string;
  size_bytes: number;
  caption: string | null;
  r2_key: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface MatchMediaReactionTable {
  media_id: string;
  user_id: string;
  emoji: string;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface PushTokensTable {
  id: Generated<string>;
  user_id: string;
  token: string;
  platform: "ios" | "android";
  device_id: string | null;
  active: number; // 0 or 1 (SQLite boolean)
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

// BetterAuth verification table (used for password reset codes, OTPs, etc.)
export interface VerificationTable {
  id: string;
  identifier: string;
  value: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

// Group-oriented scoping (see docs/superpowers/specs/2026-04-22-group-oriented-scoping-design.md)

export interface GroupsTable {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  visibility: "private" | "public";
  deleted_at: ColumnType<Date, string | undefined, string> | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface GroupMembersTable {
  id: string;
  group_id: string;
  user_id: string;
  role: "organizer" | "member";
  joined_at: ColumnType<Date, string | undefined, never>;
}

export interface GroupInvitesTable {
  id: string;
  group_id: string;
  token: string;
  created_by_user_id: string;
  expires_at: ColumnType<Date, string | undefined, string> | null;
  max_uses: number | null;
  uses_count: Generated<number>;
  target_phone: string | null;
  target_user_id: string | null;
  revoked_at: ColumnType<Date, string | undefined, string> | null;
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface GroupRosterTable {
  id: string;
  group_id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  claimed_by_user_id: string | null;
  created_by_user_id: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface GroupSettingsTable {
  group_id: string;
  key: string;
  value: string;
  updated_at: ColumnType<Date, string | undefined, string>;
}

// Database interface
export interface Database {
  locations: LocationsTable;
  matches: MatchesTable;
  courts: CourtsTable;
  signups: SignupsTable;
  match_invitations: MatchInvitationsTable;
  user: UserTable;
  account: AccountTable;
  settings: SettingsTable;
  match_player_stats: MatchPlayerStatsTable;
  match_media: MatchMediaTable;
  match_media_reaction: MatchMediaReactionTable;
  voting_criteria: VotingCriteriaTable;
  match_votes: MatchVotesTable;
  push_tokens: PushTokensTable;
  verification: VerificationTable;
  groups: GroupsTable;
  group_members: GroupMembersTable;
  group_invites: GroupInvitesTable;
  group_roster: GroupRosterTable;
  group_settings: GroupSettingsTable;
}

// SQLite system tables used by migrations and database introspection
export interface SqliteMasterTable {
  type: string;
  name: string;
  tbl_name: string;
  rootpage: number;
  sql: string | null;
}

export interface KyselyMigrationTable {
  name: string;
  timestamp: string;
}

// Extended database interface that includes SQLite system tables
export interface ExtendedDatabase extends Database {
  sqlite_master: SqliteMasterTable;
  kysely_migration: KyselyMigrationTable;
}

// Type helpers for operations

export type Location = Selectable<LocationsTable>;
export type NewLocation = Insertable<LocationsTable>;
export type LocationUpdate = Updateable<LocationsTable>;

export type Match = Selectable<MatchesTable>;
export type NewMatch = Insertable<MatchesTable>;
export type MatchUpdate = Updateable<MatchesTable>;

export type Signup = Selectable<SignupsTable>;
export type NewSignup = Insertable<SignupsTable>;
export type SignupUpdate = Updateable<SignupsTable>;

export type Court = Selectable<CourtsTable>;
export type NewCourt = Insertable<CourtsTable>;
export type CourtUpdate = Updateable<CourtsTable>;

export type MatchInvitation = Selectable<MatchInvitationsTable>;
export type NewMatchInvitation = Insertable<MatchInvitationsTable>;
export type MatchInvitationUpdate = Updateable<MatchInvitationsTable>;

export type Setting = Selectable<SettingsTable>;
export type NewSetting = Insertable<SettingsTable>;
export type SettingUpdate = Updateable<SettingsTable>;

export type MatchPlayerStats = Selectable<MatchPlayerStatsTable>;
export type NewMatchPlayerStats = Insertable<MatchPlayerStatsTable>;
export type MatchPlayerStatsUpdate = Updateable<MatchPlayerStatsTable>;

export type VotingCriteria = Selectable<VotingCriteriaTable>;
export type NewVotingCriteria = Insertable<VotingCriteriaTable>;
export type VotingCriteriaUpdate = Updateable<VotingCriteriaTable>;

export type MatchVote = Selectable<MatchVotesTable>;
export type NewMatchVote = Insertable<MatchVotesTable>;
export type MatchVoteUpdate = Updateable<MatchVotesTable>;

export type PushToken = Selectable<PushTokensTable>;
export type NewPushToken = Insertable<PushTokensTable>;
export type PushTokenUpdate = Updateable<PushTokensTable>;

export type Group = Selectable<GroupsTable>;
export type NewGroup = Insertable<GroupsTable>;
export type GroupUpdate = Updateable<GroupsTable>;

export type GroupMember = Selectable<GroupMembersTable>;
export type NewGroupMember = Insertable<GroupMembersTable>;
export type GroupMemberUpdate = Updateable<GroupMembersTable>;

export type GroupInvite = Selectable<GroupInvitesTable>;
export type NewGroupInvite = Insertable<GroupInvitesTable>;
export type GroupInviteUpdate = Updateable<GroupInvitesTable>;

export type GroupRoster = Selectable<GroupRosterTable>;
export type NewGroupRoster = Insertable<GroupRosterTable>;
export type GroupRosterUpdate = Updateable<GroupRosterTable>;

export type GroupSettingRow = Selectable<GroupSettingsTable>;
export type NewGroupSettingRow = Insertable<GroupSettingsTable>;
export type GroupSettingRowUpdate = Updateable<GroupSettingsTable>;
