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
  cost_per_player: string | null;
  shirt_cost: string | null;
  created_by_user_id: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface SignupsTable {
  id: Generated<string>;
  match_id: string;
  user_id: string | null; // nullable for guests
  player_name: string;
  player_email: string;
  status: "PAID" | "PENDING" | "CANCELLED";
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
}

// Push notification tables
export interface PushSubscriptionsTable {
  id: Generated<string>;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string | null;
  browser_info: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  last_used: ColumnType<Date, string | undefined, string>;
  active: boolean;
  vapid_subject: string | null;
}

export interface NotificationPreferencesTable {
  id: Generated<string>;
  user_id: string;
  match_reminders: boolean;
  match_updates: boolean;
  player_changes: boolean;
  new_matches: boolean;
  match_cancelled: boolean;
  reminder_times: string; // JSON array
  quiet_hours_start: number;
  quiet_hours_end: number;
  timezone: string;
  location_radius_km: number;
  preferred_locations: string | null; // JSON array
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export interface NotificationQueueTable {
  id: Generated<string>;
  user_id: string;
  match_id: string | null;
  notification_type: string;
  title: string;
  body: string;
  image_url: string | null;
  actions: string | null; // JSON array
  data: string | null; // JSON object
  scheduled_for: string; // ISO date string
  sent_at: string | null; // ISO date string
  failed_at: string | null; // ISO date string
  failure_reason: string | null;
  retry_count: number;
  max_retries: number;
  priority: "low" | "normal" | "high";
  created_at: ColumnType<Date, string | undefined, never>;
}

export interface NotificationHistoryTable {
  id: Generated<string>;
  user_id: string;
  match_id: string | null;
  notification_type: string;
  title: string;
  body: string;
  sent_at: string; // ISO date string
  clicked_at: string | null; // ISO date string
  dismissed_at: string | null; // ISO date string
  created_at: ColumnType<Date, string | undefined, never>;
}

// Database interface
export interface Database {
  locations: LocationsTable;
  matches: MatchesTable;
  courts: CourtsTable;
  signups: SignupsTable;
  match_invitations: MatchInvitationsTable;
  user: UserTable;
  push_subscriptions: PushSubscriptionsTable;
  notification_preferences: NotificationPreferencesTable;
  notification_queue: NotificationQueueTable;
  notification_history: NotificationHistoryTable;
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

export type PushSubscription = Selectable<PushSubscriptionsTable>;
export type NewPushSubscription = Insertable<PushSubscriptionsTable>;
export type PushSubscriptionUpdate = Updateable<PushSubscriptionsTable>;

export type NotificationPreferences = Selectable<NotificationPreferencesTable>;
export type NewNotificationPreferences =
  Insertable<NotificationPreferencesTable>;
export type NotificationPreferencesUpdate =
  Updateable<NotificationPreferencesTable>;

export type NotificationQueue = Selectable<NotificationQueueTable>;
export type NewNotificationQueue = Insertable<NotificationQueueTable>;
export type NotificationQueueUpdate = Updateable<NotificationQueueTable>;

export type NotificationHistory = Selectable<NotificationHistoryTable>;
export type NewNotificationHistory = Insertable<NotificationHistoryTable>;
export type NotificationHistoryUpdate = Updateable<NotificationHistoryTable>;
