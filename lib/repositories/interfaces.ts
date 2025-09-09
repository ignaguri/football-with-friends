// Repository interfaces for data access layer abstraction

import type {
  Location,
  Match,
  Signup,
  MatchInvitation,
  CreateLocationData,
  UpdateLocationData,
  CreateMatchData,
  UpdateMatchData,
  CreateSignupData,
  UpdateSignupData,
  CreateGuestSignupData,
  CreateInvitationData,
  MatchFilters,
  SignupFilters,
  MatchDetails,
  SignupWithDetails,
} from '@/lib/domain/types';

// Location Repository Interface
export interface LocationRepository {
  /**
   * Find all locations
   */
  findAll(): Promise<Location[]>;

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

// Match Repository Interface
export interface MatchRepository {
  /**
   * Find all matches with optional filters
   */
  findAll(filters?: MatchFilters): Promise<Match[]>;

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
   * Check if a date already has a match (for duplicate prevention)
   */
  existsOnDate(date: string): Promise<boolean>;
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
   * Admin-only: Add a player to a match (can override capacity)
   */
  addPlayerByAdmin(matchId: string, playerData: {
    userId?: string;
    playerName: string;
    playerEmail: string;
    status?: string;
  }, adminId: string): Promise<Signup>;

  /**
   * Admin-only: Remove a player from a match
   */
  removePlayerByAdmin(signupId: string, adminId: string): Promise<void>;

  /**
   * Find signups added by a specific user (for tracking admin/guest additions)
   */
  findAddedByUser(userId: string): Promise<Signup[]>;
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
  updateStatus(id: string, status: 'accepted' | 'declined'): Promise<MatchInvitation>;

  /**
   * Delete an invitation
   */
  delete(id: string): Promise<void>;

  /**
   * Clean up expired invitations
   */
  deleteExpired(olderThanDays: number): Promise<number>;
}

// Repository factory interface for dependency injection
export interface RepositoryFactory {
  locations: LocationRepository;
  matches: MatchRepository;
  signups: SignupRepository;
  invitations: MatchInvitationRepository;
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