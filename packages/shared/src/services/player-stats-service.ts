// Service layer for player stats business logic

import type {
  MatchPlayerStats,
  PlayerProfile,
  PlayerSummary,
  CreateMatchPlayerStatsData,
  UpdateMatchPlayerStatsData,
  User,
} from "../domain/types";
import type {
  PlayerStatsRepository,
  MatchRepository,
} from "../repositories/interfaces";

export class PlayerStatsService {
  constructor(
    private playerStatsRepository: PlayerStatsRepository,
    private matchRepository: MatchRepository,
  ) {}

  /**
   * Get all players with summary stats
   */
  async getAllPlayers(): Promise<PlayerSummary[]> {
    return this.playerStatsRepository.getAllPlayerSummaries();
  }

  /**
   * Get a player's full profile with match stats
   */
  async getPlayerProfile(userId: string): Promise<PlayerProfile | null> {
    const user = await this.playerStatsRepository.getUserById(userId);
    if (!user) {
      return null;
    }

    const aggregateStats =
      await this.playerStatsRepository.getPlayerAggregateStats(userId);
    const matchStats = await this.playerStatsRepository.findByUserId(userId);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        nationality: user.nationality,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      totalMatchesPlayed: aggregateStats.totalMatches,
      totalGoals: aggregateStats.totalGoals,
      totalThirdTimeAttendances: aggregateStats.totalThirdTimeAttendances,
      totalBeers: aggregateStats.totalBeers,
      matchStats,
    };
  }

  /**
   * Record or update stats for a player in a match
   * Authorization: admin can record for anyone, players can record their own
   */
  async recordStats(
    matchId: string,
    userId: string,
    data: Partial<CreateMatchPlayerStatsData>,
    recordedBy: User,
  ): Promise<MatchPlayerStats> {
    // Authorization check: admin or self
    if (recordedBy.role !== "admin" && recordedBy.id !== userId) {
      throw new Error("You can only record your own stats or be an admin");
    }

    // Verify match exists
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    return this.playerStatsRepository.upsert({
      matchId,
      userId,
      goals: data.goals,
      thirdTimeAttended: data.thirdTimeAttended,
      thirdTimeBeers: data.thirdTimeBeers,
    });
  }

  /**
   * Update existing stats
   * Authorization: admin or self
   */
  async updateStats(
    matchId: string,
    userId: string,
    updates: UpdateMatchPlayerStatsData,
    updatedBy: User,
  ): Promise<MatchPlayerStats> {
    if (updatedBy.role !== "admin" && updatedBy.id !== userId) {
      throw new Error("You can only update your own stats or be an admin");
    }

    const existing = await this.playerStatsRepository.findByMatchAndUser(
      matchId,
      userId,
    );

    if (!existing) {
      // If no existing stats, create them via upsert
      return this.playerStatsRepository.upsert({
        matchId,
        userId,
        goals: updates.goals,
        thirdTimeAttended: updates.thirdTimeAttended,
        thirdTimeBeers: updates.thirdTimeBeers,
      });
    }

    return this.playerStatsRepository.update(existing.id, updates);
  }

  /**
   * Get all player stats for a specific match
   */
  async getMatchStats(matchId: string): Promise<MatchPlayerStats[]> {
    return this.playerStatsRepository.findByMatchId(matchId);
  }

  /**
   * Get stats for a specific user in a specific match
   */
  async getPlayerMatchStats(
    matchId: string,
    userId: string,
  ): Promise<MatchPlayerStats | null> {
    return this.playerStatsRepository.findByMatchAndUser(matchId, userId);
  }
}
