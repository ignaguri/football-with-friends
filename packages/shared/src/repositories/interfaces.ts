// Repository interfaces for data access layer abstraction

import type {
  Location,
  Court,
  Match,
  Signup,
  User,
  MatchInvitation,
  MatchPlayerStats,
  PlayerSummary,
  PlayerRanking,
  CreateLocationData,
  UpdateLocationData,
  CreateCourtData,
  UpdateCourtData,
  CreateMatchData,
  UpdateMatchData,
  CreateSignupData,
  UpdateSignupData,
  CreateGuestSignupData,
  CreateInvitationData,
  CreateMatchPlayerStatsData,
  UpdateMatchPlayerStatsData,
  MatchFilters,
  SignupFilters,
  MatchDetails,
  SignupWithDetails,
  PushTokenInfo,
  RegisterPushTokenData,
  NotificationCategory,
} from "../domain/types";

// Location Repository Interface
export interface LocationRepository {
  /**
   * Find all locations in a group
   */
  findAll(groupId: string): Promise<Location[]>;

  /**
   * Find a location by ID
   */
  findById(id: string): Promise<Location | null>;

  /**
   * Create a new location
   */
  create(location: CreateLocationData): Promise<Location>;

  /**
   * Update an existing location
   */
  update(id: string, updates: UpdateLocationData): Promise<Location>;

  /**
   * Delete a location
   */
  delete(id: string): Promise<void>;
}

// Court Repository Interface
export interface CourtRepository {
  /**
   * Find all courts in a group
   */
  findAll(groupId: string): Promise<Court[]>;

  /**
   * Find courts by location ID (scoped to group)
   */
  findByLocationId(groupId: string, locationId: string): Promise<Court[]>;

  /**
   * Find active courts by location ID (scoped to group)
   */
  findActiveByLocationId(groupId: string, locationId: string): Promise<Court[]>;

  /**
   * Find a court by ID
   */
  findById(id: string): Promise<Court | null>;

  /**
   * Find a court by ID with location details
   */
  findByIdWithLocation(id: string): Promise<Court | null>;

  /**
   * Create a new court
   */
  create(court: CreateCourtData): Promise<Court>;

  /**
   * Update an existing court
   */
  update(id: string, updates: UpdateCourtData): Promise<Court>;

  /**
   * Delete a court
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a court name already exists for a location
   */
  existsByName(locationId: string, name: string, excludeId?: string): Promise<boolean>;

  /**
   * Get court count for a location
   */
  getCountByLocationId(locationId: string): Promise<number>;
}

// Match Repository Interface
export interface MatchRepository {
  /**
   * Find all matches with optional filters and pagination
   */
  findAll(
    filters?: MatchFilters & { limit?: number; offset?: number },
  ): Promise<{ matches: Match[]; total: number }>;

  /**
   * Find a match by ID
   */
  findById(id: string): Promise<Match | null>;

  /**
   * Find a match by ID with full details (location, signups, etc.)
   */
  findByIdWithDetails(id: string, userId?: string): Promise<MatchDetails | null>;

  /**
   * Create a new match
   */
  create(match: CreateMatchData): Promise<Match>;

  /**
   * Update an existing match
   */
  update(id: string, updates: UpdateMatchData): Promise<Match>;

  /**
   * Delete a match
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a date already has a match within the group (duplicate prevention)
   */
  existsOnDate(groupId: string, date: string): Promise<boolean>;
}

// Signup Repository Interface
export interface SignupRepository {
  /**
   * Find all signups with optional filters
   */
  findAll(filters?: SignupFilters): Promise<Signup[]>;

  /**
   * Find signups by match ID
   */
  findByMatchId(matchId: string): Promise<Signup[]>;

  /**
   * Find signups by user ID
   */
  findByUserId(userId: string): Promise<Signup[]>;

  /**
   * Find a signup by ID
   */
  findById(id: string): Promise<Signup | null>;

  /**
   * Find a signup by ID with full details
   */
  findByIdWithDetails(id: string): Promise<SignupWithDetails | null>;

  /**
   * Check if a user is already signed up for a match
   */
  isUserSignedUp(matchId: string, userId: string): Promise<boolean>;

  /**
   * Get signup count for a match
   */
  getSignupCount(matchId: string): Promise<number>;

  /**
   * Get paid signup count for a match (players with status = "PAID")
   */
  getPaidSignupCount(matchId: string): Promise<number>;

  /**
   * Get substitute count for a match (players with status = "SUBSTITUTE")
   */
  getSubstituteCount(matchId: string): Promise<number>;

  /**
   * Check if a match is at full capacity (based on paid players)
   */
  isMatchFull(matchId: string, maxPlayers: number): Promise<boolean>;

  /**
   * Create a new signup
   */
  create(signup: CreateSignupData): Promise<Signup>;

  /**
   * Update an existing signup
   */
  update(id: string, updates: UpdateSignupData): Promise<Signup>;

  /**
   * Delete a signup
   */
  delete(id: string): Promise<void>;

  /**
   * Add a guest player (special case for friend signups)
   */
  addGuest(guestData: CreateGuestSignupData): Promise<Signup>;

  /**
   * Organizer action: add a player to a match (can override capacity).
   * Authz is enforced at the route layer; this method only persists.
   */
  addPlayerAsOrganizer(
    groupId: string,
    matchId: string,
    playerData: {
      userId?: string;
      playerName: string;
      playerEmail: string;
      status?: string;
    },
    actorId: string,
  ): Promise<Signup>;

  /**
   * Organizer action: remove a player from a match.
   */
  removePlayerAsOrganizer(signupId: string, actorId: string): Promise<void>;

  /**
   * Find signups added by a specific user (for tracking admin/guest additions)
   */
  findAddedByUser(userId: string): Promise<Signup[]>;

  /**
   * Get distinct user IDs of non-cancelled signups for a match
   */
  getSignedUpUserIds(matchId: string): Promise<string[]>;
}

// Match Invitation Repository Interface (future feature)
export interface MatchInvitationRepository {
  /**
   * Find all invitations for a match
   */
  findByMatchId(matchId: string): Promise<MatchInvitation[]>;

  /**
   * Find all invitations sent by a user
   */
  findByInviterId(userId: string): Promise<MatchInvitation[]>;

  /**
   * Find invitations by email
   */
  findByEmail(email: string): Promise<MatchInvitation[]>;

  /**
   * Create a new invitation
   */
  create(invitation: CreateInvitationData): Promise<MatchInvitation>;

  /**
   * Update invitation status (accept/decline)
   */
  updateStatus(id: string, status: "accepted" | "declined"): Promise<MatchInvitation>;

  /**
   * Delete an invitation
   */
  delete(id: string): Promise<void>;

  /**
   * Clean up expired invitations
   */
  deleteExpired(olderThanDays: number): Promise<number>;
}

// Player Stats Repository Interface
export interface PlayerStatsRepository {
  /**
   * Find stats for a specific match and user
   */
  findByMatchAndUser(matchId: string, userId: string): Promise<MatchPlayerStats | null>;

  /**
   * Find all stats for a match
   */
  findByMatchId(matchId: string): Promise<MatchPlayerStats[]>;

  /**
   * Find all stats for a user
   */
  findByUserId(userId: string): Promise<MatchPlayerStats[]>;

  /**
   * Create or update stats (upsert)
   */
  upsert(data: CreateMatchPlayerStatsData): Promise<MatchPlayerStats>;

  /**
   * Update existing stats by ID
   */
  update(id: string, updates: UpdateMatchPlayerStatsData): Promise<MatchPlayerStats>;

  /**
   * Delete stats
   */
  delete(id: string): Promise<void>;

  /**
   * Get aggregated stats for a user across all matches
   */
  getPlayerAggregateStats(userId: string): Promise<{
    totalMatches: number;
    totalGoals: number;
    totalThirdTimeAttendances: number;
    totalBeers: number;
  }>;

  /**
   * Get all players with stats summaries
   */
  getAllPlayerSummaries(): Promise<PlayerSummary[]>;

  /**
   * Get user info by ID (from user table)
   */
  getUserById(userId: string): Promise<User | null>;

  /**
   * Get player rankings by total matches played, scoped to a group.
   */
  getRankingsByMatches(groupId: string, limit: number): Promise<PlayerRanking[]>;

  /**
   * Get player rankings by third time attendances, scoped to a group.
   */
  getRankingsByThirdTimes(groupId: string, limit: number): Promise<PlayerRanking[]>;

  /**
   * Get player rankings by total beers consumed, scoped to a group.
   */
  getRankingsByBeers(groupId: string, limit: number): Promise<PlayerRanking[]>;
}

// Push Token Repository Interface
export interface PushTokenRepository {
  upsert(data: RegisterPushTokenData): Promise<PushTokenInfo>;
  /**
   * Find active push tokens for a user, optionally filtered by notification
   * category preference. When `category` is provided, tokens are returned only
   * if both the master `push_enabled` and the per-category preference are on.
   * Missing prefs row → defaults to all-on (coalesce-based).
   */
  findActiveByUserId(userId: string, category?: NotificationCategory): Promise<PushTokenInfo[]>;
  findActiveByUserIds(userIds: string[], category?: NotificationCategory): Promise<PushTokenInfo[]>;
  deactivateToken(token: string): Promise<void>;
  deactivateTokenForUser(token: string, userId: string): Promise<void>;
  deactivateByUserId(userId: string): Promise<void>;
  deleteByToken(token: string): Promise<void>;
}

// Repository factory interface for dependency injection
export interface RepositoryFactory {
  locations: LocationRepository;
  courts: CourtRepository;
  matches: MatchRepository;
  signups: SignupRepository;
  invitations: MatchInvitationRepository;
  playerStats: PlayerStatsRepository;
  pushTokens: PushTokenRepository;
}

// Database transaction interface
export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// Transactional repository operations
export interface TransactionalRepository {
  /**
   * Execute operations within a transaction
   */
  withTransaction<T>(operation: (repos: RepositoryFactory) => Promise<T>): Promise<T>;
}
