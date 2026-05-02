// Ranking Service - Orchestrates player rankings and voting statistics

import type { PlayerStatsRepository } from "../repositories/interfaces";
import type { VotingRepository } from "../repositories/voting-repository";
import type {
  RankingCriteria,
  PlayerRanking,
  PlayerVotingStats,
  VotingLeaderboard,
} from "../domain/types";

export class RankingService {
  constructor(
    private playerStatsRepository: PlayerStatsRepository,
    private votingRepository: VotingRepository,
  ) {}

  /**
   * Get player rankings by specified criteria, scoped to a group.
   */
  async getPlayerRankings(
    groupId: string,
    criteria: RankingCriteria,
    limit = 50,
  ): Promise<PlayerRanking[]> {
    switch (criteria) {
      case "matches":
        return this.playerStatsRepository.getRankingsByMatches(groupId, limit);
      case "third_times":
        return this.playerStatsRepository.getRankingsByThirdTimes(groupId, limit);
      case "beers":
        return this.playerStatsRepository.getRankingsByBeers(groupId, limit);
      case "total_votes":
        return this.votingRepository.getRankingsByTotalVotes(groupId, limit);
      default:
        throw new Error(`Unsupported ranking criteria: ${criteria}`);
    }
  }

  /**
   * Get voting leaderboard (top N players per criteria), scoped to a group.
   */
  async getVotingLeaderboard(
    groupId: string,
    language: "en" | "es",
    topN = 3,
  ): Promise<VotingLeaderboard> {
    return this.votingRepository.getVotingLeaderboard(groupId, language, topN);
  }

  /**
   * Get voting statistics for a specific player
   */
  async getPlayerVotingStats(userId: string, language: "en" | "es"): Promise<PlayerVotingStats> {
    return this.votingRepository.getPlayerVotingStats(userId, language);
  }
}
