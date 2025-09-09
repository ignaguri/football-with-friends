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

export interface MatchInvitationsTable {
  id: Generated<string>;
  match_id: string;
  email: string;
  invited_by_user_id: string;
  status: "pending" | "accepted" | "declined";
  invited_at: ColumnType<Date, string | undefined, never>;
  responded_at: ColumnType<Date, string | undefined, string> | null;
}

// Database interface
export interface Database {
  locations: LocationsTable;
  matches: MatchesTable;
  signups: SignupsTable;
  match_invitations: MatchInvitationsTable;
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

export type MatchInvitation = Selectable<MatchInvitationsTable>;
export type NewMatchInvitation = Insertable<MatchInvitationsTable>;
export type MatchInvitationUpdate = Updateable<MatchInvitationsTable>;
