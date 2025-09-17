// Domain types for the football match application

// Player status types for match participation
export const PLAYER_STATUSES = ["PAID", "PENDING", "CANCELLED"] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

// Signup types to track how a player was added
export const SIGNUP_TYPES = [
  "self",
  "guest",
  "admin_added",
  "invitation",
] as const;
export type SignupType = (typeof SIGNUP_TYPES)[number];

// Match status types
export const MATCH_STATUSES = ["upcoming", "cancelled", "completed"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

// Core domain entities

export interface Location {
  id: string;
  name: string;
  address?: string;
  coordinates?: string;
  courtCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Court {
  id: string;
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
  locationId: string;
  courtId?: string;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:MM format
  status: MatchStatus;
  maxPlayers: number;
  costPerPlayer?: string;
  shirtCost?: string;
  createdByUserId: string;
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
  matchId: string;
  userId?: string; // nullable for guests
  playerName: string;
  playerEmail: string;
  status: PlayerStatus;
  signupType: SignupType;
  guestOwnerId?: string; // for guest signups
  addedByUserId: string; // tracks who added this signup
  signedUpAt: Date;
  updatedAt: Date;

  // Populated fields (from joins)
  user?: User;
  guestOwner?: User;
  addedByUser?: User;
  guestOwnerEmail?: string; // populated from join
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

// User type from BetterAuth (extended)
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

// Data transfer objects (DTOs) for creating/updating entities

export interface CreateLocationData {
  name: string;
  address?: string;
  coordinates?: string;
  courtCount?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateLocationData extends Partial<CreateLocationData> {}

export interface CreateCourtData {
  locationId: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateCourtData extends Partial<CreateCourtData> {}

export interface CreateMatchData {
  locationId: string;
  courtId?: string;
  date: string;
  time: string;
  maxPlayers?: number;
  costPerPlayer?: string;
  shirtCost?: string;
  createdByUserId: string;
}

export interface UpdateMatchData
  extends Partial<Omit<CreateMatchData, "createdByUserId">> {
  status?: MatchStatus;
}

export interface CreateSignupData {
  matchId: string;
  userId?: string;
  playerName: string;
  playerEmail: string;
  status?: PlayerStatus;
  signupType: SignupType;
  guestOwnerId?: string;
  addedByUserId: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateSignupData
  extends Partial<Omit<CreateSignupData, "matchId" | "addedByUserId">> {}

export interface CreateGuestSignupData {
  matchId: string;
  guestName?: string;
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

// Filter and query types

export interface MatchFilters {
  status?: MatchStatus;
  type?: "past" | "upcoming";
  userId?: string; // matches where user is signed up
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SignupFilters {
  matchId?: string;
  userId?: string;
  status?: PlayerStatus;
  signupType?: SignupType;
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
