// Service layer for match-related business logic
// This layer sits between API routes and repositories, handling business rules

import type {
  Match,
  MatchDetails,
  CreateMatchData,
  UpdateMatchData,
  MatchFilters,
  CreateSignupData,
  CreateGuestSignupData,
  Signup,
  SignupWithDetails,
  User,
} from '@/lib/domain/types';

import type {
  MatchRepository,
  SignupRepository,
  LocationRepository,
} from '@/lib/repositories/interfaces';

export class MatchService {
  constructor(
    private matchRepository: MatchRepository,
    private signupRepository: SignupRepository,
    private locationRepository: LocationRepository,
  ) {}

  /**
   * Get all matches with optional filtering
   */
  async getAllMatches(filters?: MatchFilters): Promise<Match[]> {
    return this.matchRepository.findAll(filters);
  }

  /**
   * Get a match by ID with full details
   */
  async getMatchDetails(matchId: string, userId?: string): Promise<MatchDetails | null> {
    return this.matchRepository.findByIdWithDetails(matchId, userId);
  }

  /**
   * Create a new match (admin only)
   */
  async createMatch(matchData: CreateMatchData, createdBy: User): Promise<Match> {
    if (createdBy.role !== 'admin') {
      throw new Error('Only administrators can create matches');
    }

    // Validate match data
    this.validateMatchData(matchData);

    // Check for duplicate matches on the same date
    const existsOnDate = await this.matchRepository.existsOnDate(matchData.date);
    if (existsOnDate) {
      throw new Error('A match already exists on this date');
    }

    // Ensure location exists
    const location = await this.locationRepository.findById(matchData.locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    return this.matchRepository.create({
      ...matchData,
      createdByUserId: createdBy.id,
    });
  }

  /**
   * Update a match (admin only)
   */
  async updateMatch(matchId: string, updates: UpdateMatchData, updatedBy: User): Promise<Match> {
    if (updatedBy.role !== 'admin') {
      throw new Error('Only administrators can update matches');
    }

    const existingMatch = await this.matchRepository.findById(matchId);
    if (!existingMatch) {
      throw new Error('Match not found');
    }

    // If updating location, ensure it exists
    if (updates.locationId) {
      const location = await this.locationRepository.findById(updates.locationId);
      if (!location) {
        throw new Error('Location not found');
      }
    }

    // If updating date, check for duplicates (excluding current match)
    if (updates.date && updates.date !== existingMatch.date) {
      const existsOnDate = await this.matchRepository.existsOnDate(updates.date);
      if (existsOnDate) {
        throw new Error('A match already exists on this date');
      }
    }

    return this.matchRepository.update(matchId, updates);
  }

  /**
   * Delete a match (admin only)
   */
  async deleteMatch(matchId: string, deletedBy: User): Promise<void> {
    if (deletedBy.role !== 'admin') {
      throw new Error('Only administrators can delete matches');
    }

    const existingMatch = await this.matchRepository.findById(matchId);
    if (!existingMatch) {
      throw new Error('Match not found');
    }

    // Check if match has signups
    const signupCount = await this.signupRepository.getSignupCount(matchId);
    if (signupCount > 0) {
      // Optionally, you might want to prevent deletion or cascade delete
      console.warn(`Deleting match ${matchId} with ${signupCount} signups`);
    }

    await this.matchRepository.delete(matchId);
  }

  /**
   * Sign up a user for a match
   */
  async signUpUser(matchId: string, user: User, playerData?: {
    playerName?: string;
    playerEmail?: string;
    status?: string;
  }): Promise<Signup> {
    // Validate match exists
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Check if match is still open
    if (match.status !== 'upcoming') {
      throw new Error('Cannot sign up for this match');
    }

    // Check if user is already signed up
    const isAlreadySignedUp = await this.signupRepository.isUserSignedUp(matchId, user.id);
    if (isAlreadySignedUp) {
      throw new Error('User is already signed up for this match');
    }

    // Check capacity
    const currentSignups = await this.signupRepository.getSignupCount(matchId);
    if (currentSignups >= match.maxPlayers) {
      throw new Error('Match is full');
    }

    const signupData: CreateSignupData = {
      matchId,
      userId: user.id,
      playerName: playerData?.playerName || user.name,
      playerEmail: playerData?.playerEmail || user.email,
      status: (playerData?.status as any) || 'PENDING',
      signupType: 'self',
      addedByUserId: user.id,
    };

    return this.signupRepository.create(signupData);
  }

  /**
   * Add a guest player to a match
   */
  async addGuestPlayer(
    matchId: string,
    guestData: CreateGuestSignupData,
    addedBy: User
  ): Promise<Signup> {
    // Validate match exists
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Check if match is still open
    if (match.status !== 'upcoming') {
      throw new Error('Cannot add guests to this match');
    }

    // Verify the owner is signed up (business rule)
    const isOwnerSignedUp = await this.signupRepository.isUserSignedUp(matchId, addedBy.id);
    if (!isOwnerSignedUp) {
      throw new Error('You must be signed up to add guests');
    }

    // Check capacity
    const currentSignups = await this.signupRepository.getSignupCount(matchId);
    if (currentSignups >= match.maxPlayers) {
      throw new Error('Match is full');
    }

    return this.signupRepository.addGuest({
      ...guestData,
      ownerUserId: addedBy.id,
      ownerName: addedBy.name,
      ownerEmail: addedBy.email,
    });
  }

  /**
   * Admin: Add any player to a match (can override capacity)
   */
  async addPlayerByAdmin(
    matchId: string,
    playerData: {
      userId?: string;
      playerName: string;
      playerEmail: string;
      status?: string;
    },
    admin: User
  ): Promise<Signup> {
    if (admin.role !== 'admin') {
      throw new Error('Only administrators can add players directly');
    }

    // Validate match exists
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // If userId provided, check if user is already signed up
    if (playerData.userId) {
      const isAlreadySignedUp = await this.signupRepository.isUserSignedUp(
        matchId,
        playerData.userId
      );
      if (isAlreadySignedUp) {
        throw new Error('User is already signed up for this match');
      }
    }

    return this.signupRepository.addPlayerByAdmin(matchId, playerData, admin.id);
  }

  /**
   * Admin: Remove a player from a match
   */
  async removePlayerByAdmin(signupId: string, admin: User): Promise<void> {
    if (admin.role !== 'admin') {
      throw new Error('Only administrators can remove players');
    }

    const signup = await this.signupRepository.findById(signupId);
    if (!signup) {
      throw new Error('Signup not found');
    }

    await this.signupRepository.removePlayerByAdmin(signupId, admin.id);
  }

  /**
   * Get all signups for a match
   */
  async getMatchSignups(matchId: string): Promise<Signup[]> {
    return this.signupRepository.findByMatchId(matchId);
  }

  /**
   * Update a signup (for status changes, etc.)
   */
  async updateSignup(
    signupId: string,
    updates: { status?: string },
    updatedBy: User
  ): Promise<Signup> {
    const signup = await this.signupRepository.findById(signupId);
    if (!signup) {
      throw new Error('Signup not found');
    }

    // Authorization: only admin or the user who added the signup can update it
    const canUpdate = updatedBy.role === 'admin' || 
                     updatedBy.id === signup.addedByUserId ||
                     updatedBy.id === signup.userId;
    
    if (!canUpdate) {
      throw new Error('Not authorized to update this signup');
    }

    return this.signupRepository.update(signupId, {
      status: updates.status as any,
    });
  }

  /**
   * Get user's signups (matches they're signed up for)
   */
  async getUserSignups(userId: string): Promise<Signup[]> {
    return this.signupRepository.findByUserId(userId);
  }

  /**
   * Check if a user can add more guests to a match
   */
  async canUserAddGuests(matchId: string, userId: string): Promise<{
    canAdd: boolean;
    reason?: string;
    remainingSpots: number;
  }> {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      return { canAdd: false, reason: 'Match not found', remainingSpots: 0 };
    }

    if (match.status !== 'upcoming') {
      return { canAdd: false, reason: 'Match is not open for signups', remainingSpots: 0 };
    }

    const isUserSignedUp = await this.signupRepository.isUserSignedUp(matchId, userId);
    if (!isUserSignedUp) {
      return { canAdd: false, reason: 'You must be signed up to add guests', remainingSpots: 0 };
    }

    const currentSignups = await this.signupRepository.getSignupCount(matchId);
    const remainingSpots = Math.max(0, match.maxPlayers - currentSignups);

    if (remainingSpots === 0) {
      return { canAdd: false, reason: 'Match is full', remainingSpots: 0 };
    }

    return { canAdd: true, remainingSpots };
  }

  /**
   * Get match statistics
   */
  async getMatchStats(matchId: string): Promise<{
    totalSignups: number;
    paidSignups: number;
    pendingSignups: number;
    guestSignups: number;
    availableSpots: number;
  }> {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    const signups = await this.signupRepository.findByMatchId(matchId);

    return {
      totalSignups: signups.length,
      paidSignups: signups.filter(s => s.status === 'PAID').length,
      pendingSignups: signups.filter(s => s.status === 'PENDING').length,
      guestSignups: signups.filter(s => s.signupType === 'guest').length,
      availableSpots: Math.max(0, match.maxPlayers - signups.length),
    };
  }

  /**
   * Validate match data
   */
  private validateMatchData(matchData: CreateMatchData): void {
    if (!matchData.date || !matchData.time) {
      throw new Error('Date and time are required');
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(matchData.date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    // Validate time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(matchData.time)) {
      throw new Error('Invalid time format. Use HH:MM');
    }

    // Validate maxPlayers
    if (matchData.maxPlayers !== undefined && matchData.maxPlayers < 2) {
      throw new Error('Match must allow at least 2 players');
    }

    // Validate date is not in the past
    const matchDate = new Date(matchData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (matchDate < today) {
      throw new Error('Match date cannot be in the past');
    }
  }
}