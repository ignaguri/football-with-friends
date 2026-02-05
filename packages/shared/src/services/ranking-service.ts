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
    private votingRepository: VotingRepository
  ) {}

  /**
   * Get player rankings by specified criteria
   */
  async getPlayerRankings(
    criteria: RankingCriteria,
    limit = 50
  ): Promise<PlayerRanking[]> {
    switch (criteria) {
      case "matches":
        return this.playerStatsRepository.getRankingsByMatches(limit);
      case "third_times":
        return this.playerStatsRepository.getRankingsByThirdTimes(limit);
      case "beers":
        return this.playerStatsRepository.getRankingsByBeers(limit);
      case "total_votes":
        return this.votingRepository.getRankingsByTotalVotes(limit);
      default:
        throw new Error(`Unsupported ranking criteria: ${criteria}`);
    }
  }

  /**
   * Get voting leaderboard (top N players per criteria)
   */
  async getVotingLeaderboard(
    language: "en" | "es",
    topN = 3
  ): Promise<VotingLeaderboard> {
    return this.votingRepository.getVotingLeaderboard(language, topN);
  }

  /**
   * Get voting statistics for a specific player
   */
  async getPlayerVotingStats(
    userId: string,
    language: "en" | "es"
  ): Promise<PlayerVotingStats> {
    return this.votingRepository.getPlayerVotingStats(userId, language);
  }
}
