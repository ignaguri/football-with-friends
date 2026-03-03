// Domain types for the football match application

// Player status types for match participation
export const PLAYER_STATUSES = ["PAID", "PENDING", "CANCELLED", "SUBSTITUTE"] as const;
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
  maxSubstitutes: number;
  costPerPlayer?: string;
  sameDayCost?: string;
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

// User type from BetterAuth (extended)
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

export type RankingCriteria =
  | "matches"
  | "third_times"
  | "beers"
  | "total_votes";

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
  name: string;
  address?: string;
  coordinates?: string;
  courtCount?: number;
}

export interface UpdateLocationData extends Partial<CreateLocationData> {}

export interface CreateCourtData {
  locationId: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCourtData extends Partial<CreateCourtData> {}

export interface CreateMatchData {
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

export interface CreateMatchPlayerStatsData {
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
