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
  guest_owner_id: string | null; // for guest signups
  added_by_user_id: string;
  signed_up_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface CourtsTable {
  id: Generated<string>;
  location_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
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
  last_engagement_reminder_at: string | null;
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
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface MatchVotesTable {
  id: Generated<string>;
  match_id: string;
  voter_user_id: string;
  criteria_id: string;
  voted_for_user_id: string;
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
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
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
  voting_criteria: VotingCriteriaTable;
  match_votes: MatchVotesTable;
  push_tokens: PushTokensTable;
  verification: VerificationTable;
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
