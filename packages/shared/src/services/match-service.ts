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
  User,
  PlayerStatus,
} from "../domain/types";
import type {
  MatchRepository,
  SignupRepository,
  LocationRepository,
  CourtRepository,
} from "../repositories/interfaces";
import { getDatabase } from "../database/connection";

export class MatchService {
  constructor(
    private matchRepository: MatchRepository,
    private signupRepository: SignupRepository,
    private locationRepository: LocationRepository,
    private courtRepository: CourtRepository,
  ) {}

  /**
   * Get all matches with optional filtering and pagination
   */
  async getAllMatches(filters?: MatchFilters & { limit?: number; offset?: number }): Promise<{ matches: Match[]; total: number }> {
    return this.matchRepository.findAll(filters);
  }

  /**
   * Get a match by ID with full details
   */
  async getMatchDetails(
    matchId: string,
    userId?: string,
  ): Promise<MatchDetails | null> {
    return this.matchRepository.findByIdWithDetails(matchId, userId);
  }

  /**
   * Create a new match.
   * Authorization is enforced by the calling route (requireOrganizer). This
   * layer just validates inputs and scopes the row to the provided group.
   */
  async createMatch(
    groupId: string,
    matchData: Omit<CreateMatchData, "groupId" | "createdByUserId">,
    createdBy: User,
  ): Promise<Match> {
    // Validate match data
    this.validateMatchData(matchData);

    // Ensure location exists first and belongs to the same group.
    const location = await this.locationRepository.findById(
      matchData.locationId,
    );
    if (!location || location.groupId !== groupId) {
      throw new Error("Location not found");
    }

    // If courtId is provided, validate it belongs to the location AND the group.
    if (matchData.courtId) {
      const court = await this.courtRepository.findById(matchData.courtId);
      if (!court || court.groupId !== groupId) {
        throw new Error("Court not found");
      }
      if (court.locationId !== matchData.locationId) {
        throw new Error("Court does not belong to the selected location");
      }
    }

    // Check for duplicate matches on the same date within this group.
    const existsOnDate = await this.matchRepository.existsOnDate(
      groupId,
      matchData.date,
    );
    if (existsOnDate) {
      throw new Error("A match already exists on this date");
    }

    return this.matchRepository.create({
      ...matchData,
      groupId,
      createdByUserId: createdBy.id,
    });
  }

  /**
   * Update a match. Caller must be organizer of the match's group (enforced
   * at the route boundary); this method re-validates that the match belongs
   * to the group it claims to, preventing cross-group writes by id.
   */
  async updateMatch(
    groupId: string,
    matchId: string,
    updates: UpdateMatchData,
  ): Promise<Match> {
    const existingMatch = await this.matchRepository.findById(matchId);
    if (!existingMatch || existingMatch.groupId !== groupId) {
      throw new Error("Match not found");
    }

    // If updating location, ensure it exists AND belongs to the same group.
    if (updates.locationId) {
      const location = await this.locationRepository.findById(
        updates.locationId,
      );
      if (!location || location.groupId !== groupId) {
        throw new Error("Location not found");
      }
    }

    // If updating date, check for duplicates (excluding current match) within group.
    if (updates.date && updates.date !== existingMatch.date) {
      const existsOnDate = await this.matchRepository.existsOnDate(
        groupId,
        updates.date,
      );
      if (existsOnDate) {
        throw new Error("A match already exists on this date");
      }
    }

    return this.matchRepository.update(matchId, updates);
  }

  /**
   * Delete a match. Caller must be organizer (route-level); we verify the
   * match belongs to the caller's group before hard-deleting.
   */
  async deleteMatch(groupId: string, matchId: string): Promise<void> {
    const existingMatch = await this.matchRepository.findById(matchId);
    if (!existingMatch || existingMatch.groupId !== groupId) {
      throw new Error("Match not found");
    }

    // Delete related records that lack ON DELETE CASCADE
    const db = getDatabase();
    await db.deleteFrom("match_player_stats").where("match_id", "=", matchId).execute();
    await db.deleteFrom("match_votes").where("match_id", "=", matchId).execute();

    await this.matchRepository.delete(matchId);
  }

  /**
   * Sign up a user for a match
   * If match is full but substitute spots are available, user joins as SUBSTITUTE
   */
  async signUpUser(
    groupId: string,
    matchId: string,
    user: User,
    playerData?: {
      playerName?: string;
      playerEmail?: string;
      status?: string;
    },
  ): Promise<Signup> {
    // Validate match exists and is in the caller's group.
    const match = await this.matchRepository.findById(matchId);
    if (!match || match.groupId !== groupId) {
      throw new Error("Match not found");
    }

    // Check if match is still open
    if (match.status !== "upcoming") {
      throw new Error("Cannot sign up for this match");
    }

    // Check if user is already signed up
    const isAlreadySignedUp = await this.signupRepository.isUserSignedUp(
      matchId,
      user.id,
    );
    if (isAlreadySignedUp) {
      throw new Error("User is already signed up for this match");
    }

    // Check capacity (based on paid players only)
    const isFull = await this.signupRepository.isMatchFull(
      matchId,
      match.maxPlayers,
    );

    let signupStatus: PlayerStatus = (playerData?.status as PlayerStatus) || "PENDING";

    if (isFull) {
      // Match is full - check if substitute spots are available
      const substituteCount = await this.signupRepository.getSubstituteCount(matchId);
      const maxSubstitutes = match.maxSubstitutes || 0;

      if (substituteCount >= maxSubstitutes) {
        throw new Error("Match and substitute list are full");
      }

      // Join as substitute
      signupStatus = "SUBSTITUTE";
    }

    const signupData: CreateSignupData = {
      groupId,
      matchId,
      userId: user.id,
      playerName: playerData?.playerName || user.name,
      playerEmail: playerData?.playerEmail || user.email,
      status: signupStatus,
      signupType: "self",
      addedByUserId: user.id,
    };

    return this.signupRepository.create(signupData);
  }

  /**
   * Add a guest player to a match
   * If match is full but substitute spots are available, guest joins as SUBSTITUTE
   */
  async addGuestPlayer(
    groupId: string,
    matchId: string,
    guestData: Omit<CreateGuestSignupData, "groupId">,
    addedBy: User,
  ): Promise<Signup> {
    // Validate match exists and is in the caller's group.
    const match = await this.matchRepository.findById(matchId);
    if (!match || match.groupId !== groupId) {
      throw new Error("Match not found");
    }

    // Check if match is still open
    if (match.status !== "upcoming") {
      throw new Error("Cannot add guests to this match");
    }

    // Check capacity (based on paid players only)
    const isFull = await this.signupRepository.isMatchFull(
      matchId,
      match.maxPlayers,
    );

    let guestStatus = guestData.status || "PENDING";

    if (isFull) {
      // Match is full - check if substitute spots are available
      const substituteCount = await this.signupRepository.getSubstituteCount(matchId);
      const maxSubstitutes = match.maxSubstitutes || 0;

      if (substituteCount >= maxSubstitutes) {
        throw new Error("Match and substitute list are full");
      }

      // Guest joins as substitute
      guestStatus = "SUBSTITUTE";
    }

    return this.signupRepository.addGuest({
      ...guestData,
      groupId,
      status: guestStatus as PlayerStatus,
      ownerUserId: addedBy.id,
      ownerName: addedBy.name,
      ownerEmail: addedBy.email,
    });
  }

  /**
   * Organizer: Add any player to a match (can override capacity). Authz is
   * enforced at the route; this method validates the match belongs to the
   * caller's group.
   */
  async addPlayerAsOrganizer(
    groupId: string,
    matchId: string,
    playerData: {
      userId?: string;
      playerName: string;
      playerEmail: string;
      status?: string;
    },
    actor: User,
  ): Promise<Signup> {
    const match = await this.matchRepository.findById(matchId);
    if (!match || match.groupId !== groupId) {
      throw new Error("Match not found");
    }

    if (playerData.userId) {
      const isAlreadySignedUp = await this.signupRepository.isUserSignedUp(
        matchId,
        playerData.userId,
      );
      if (isAlreadySignedUp) {
        throw new Error("User is already signed up for this match");
      }
    }

    return this.signupRepository.addPlayerAsOrganizer(
      groupId,
      matchId,
      playerData,
      actor.id,
    );
  }

  /**
   * Organizer: Remove a player from a match. Authz at route; here we
   * verify cross-group isolation via the signup's group_id.
   */
  async removePlayerAsOrganizer(
    groupId: string,
    signupId: string,
    actor: User,
  ): Promise<void> {
    const signup = await this.signupRepository.findById(signupId);
    if (!signup || signup.groupId !== groupId) {
      throw new Error("Signup not found");
    }

    await this.signupRepository.removePlayerAsOrganizer(signupId, actor.id);
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
    groupId: string,
    signupId: string,
    updates: { status?: string; playerName?: string },
    updatedBy: User,
    isOrganizer: boolean,
  ): Promise<{
    signup: Signup;
    oldStatus: string;
    promotedSubstitute?: { id: string; userId?: string; playerName: string };
  }> {
    const signup = await this.signupRepository.findById(signupId);
    if (!signup || signup.groupId !== groupId) {
      throw new Error("Signup not found");
    }

    // Authorization: organizer of the current group, the user who added the
    // signup, or the signup's own user can update it.
    const canUpdate =
      isOrganizer ||
      updatedBy.id === signup.addedByUserId ||
      updatedBy.id === signup.userId;

    if (!canUpdate) {
      throw new Error("Not authorized to update this signup");
    }

    // Store the old status to check for transitions
    const oldStatus = signup.status;

    // Update the signup
    const updatedSignup = await this.signupRepository.update(signupId, {
      ...(updates.status && { status: updates.status as PlayerStatus }),
      ...(updates.playerName && { playerName: updates.playerName }),
    });

    let promotedSubstitute: { id: string; userId?: string; playerName: string } | undefined;

    // Auto-promote substitute when PAID player cancels
    if (oldStatus === "PAID" && updates.status === "CANCELLED") {
      try {
        // Find all signups for this match
        const allSignups = await this.signupRepository.findByMatchId(signup.matchId);

        // Find first substitute (ordered by signup date)
        const substitutes = allSignups
          .filter((s) => s.status === "SUBSTITUTE")
          .sort((a, b) => new Date(a.signedUpAt).getTime() - new Date(b.signedUpAt).getTime());

        if (substitutes.length > 0) {
          const firstSubstitute = substitutes[0];
          if (firstSubstitute) {
            // Promote to PENDING
            await this.signupRepository.update(firstSubstitute.id, {
              status: "PENDING",
            });

            promotedSubstitute = {
              id: firstSubstitute.id,
              userId: firstSubstitute.userId,
              playerName: firstSubstitute.playerName,
            };

            console.log(
              `[AUTO-PROMOTE] Substitute ${firstSubstitute.id} (${firstSubstitute.playerName}) promoted to PENDING for match ${signup.matchId}`
            );
          }
        }
      } catch (error) {
        // Log error but don't fail the main operation
        console.error("[AUTO-PROMOTE] Error promoting substitute:", error);
      }
    }

    return { signup: updatedSignup, oldStatus, promotedSubstitute };
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
  async canUserAddGuests(
    matchId: string,
    userId: string,
  ): Promise<{
    canAdd: boolean;
    reason?: string;
    remainingSpots: number;
  }> {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      return { canAdd: false, reason: "Match not found", remainingSpots: 0 };
    }

    if (match.status !== "upcoming") {
      return {
        canAdd: false,
        reason: "Match is not open for signups",
        remainingSpots: 0,
      };
    }

    const isUserSignedUp = await this.signupRepository.isUserSignedUp(
      matchId,
      userId,
    );
    if (!isUserSignedUp) {
      return {
        canAdd: false,
        reason: "You must be signed up to add guests",
        remainingSpots: 0,
      };
    }

    const paidSignups = await this.signupRepository.getPaidSignupCount(matchId);
    const remainingSpots = Math.max(0, match.maxPlayers - paidSignups);

    if (remainingSpots === 0) {
      return { canAdd: false, reason: "Match is full", remainingSpots: 0 };
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
      throw new Error("Match not found");
    }

    const [signups, paidSignupsCount] = await Promise.all([
      this.signupRepository.findByMatchId(matchId),
      this.signupRepository.getPaidSignupCount(matchId),
    ]);

    return {
      totalSignups: signups.length,
      paidSignups: paidSignupsCount,
      pendingSignups: signups.filter((s) => s.status === "PENDING").length,
      guestSignups: signups.filter((s) => s.signupType === "guest").length,
      availableSpots: Math.max(0, match.maxPlayers - paidSignupsCount),
    };
  }

  /**
   * Validate match data
   */
  private validateMatchData(
    matchData: Omit<CreateMatchData, "groupId" | "createdByUserId">,
  ): void {
    if (!matchData.date || !matchData.time) {
      throw new Error("Date and time are required");
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(matchData.date)) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    // Validate time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(matchData.time)) {
      throw new Error("Invalid time format. Use HH:MM");
    }

    // Validate maxPlayers
    if (matchData.maxPlayers !== undefined && matchData.maxPlayers < 2) {
      throw new Error("Match must allow at least 2 players");
    }

    // Validate date is not in the past
    const matchDate = new Date(matchData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (matchDate < today) {
      throw new Error("Match date cannot be in the past");
    }
  }
}
