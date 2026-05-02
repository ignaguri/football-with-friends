// Voting Service - Business logic for match voting system

import { addDays } from "date-fns";

import type {
  Match,
  VotingCriteria,
  MatchVote,
  LocalizedVotingCriteria,
  UserMatchVotes,
  MatchVotingResults,
  MatchStats,
} from "../domain/types";
import type { VotingRepository } from "../repositories/voting-repository";

import { votingRepository } from "../repositories/voting-repository";
import { convertToAppTimezone } from "../utils/timezone";

const VOTING_AUTO_CLOSE_DAYS = 7;

// Auto-close moment = end-of-day in the app timezone of the match date, plus N days.
function computeVotingAutoCloseAt(matchDate: string, days: number): string {
  const endOfDay = convertToAppTimezone(`${matchDate}T23:59:59`);
  return addDays(endOfDay, days).toISOString();
}

export class VotingService {
  private repository: VotingRepository;

  constructor(repository?: VotingRepository) {
    this.repository = repository || votingRepository;
  }

  // ==================== VOTING CRITERIA ====================

  /**
   * Get all active voting criteria (localized)
   */
  async getActiveCriteria(language: "en" | "es" = "en"): Promise<LocalizedVotingCriteria[]> {
    return this.repository.findAllCriteriaLocalized(language, true);
  }

  /**
   * Get all voting criteria including inactive (admin only)
   */
  async getAllCriteria(language: "en" | "es" = "en"): Promise<LocalizedVotingCriteria[]> {
    return this.repository.findAllCriteriaLocalized(language, false);
  }

  /**
   * Get all voting criteria with full data (admin only, for editing)
   */
  async getAllCriteriaFull(): Promise<VotingCriteria[]> {
    return this.repository.findAllCriteria(false);
  }

  /**
   * Create new voting criteria (admin only)
   */
  async createCriteria(data: {
    code: string;
    nameEn: string;
    nameEs: string;
    descriptionEn?: string;
    descriptionEs?: string;
    sortOrder?: number;
  }): Promise<VotingCriteria> {
    // Validate code is unique
    const existing = await this.repository.findCriteriaByCode(data.code);
    if (existing) {
      throw new Error("Criteria code already exists");
    }

    return this.repository.createCriteria(data);
  }

  /**
   * Update voting criteria (admin only)
   */
  async updateCriteria(
    id: string,
    data: {
      code?: string;
      nameEn?: string;
      nameEs?: string;
      descriptionEn?: string;
      descriptionEs?: string;
      isActive?: boolean;
      sortOrder?: number;
    },
  ): Promise<VotingCriteria> {
    // Check criteria exists
    const existing = await this.repository.findCriteriaById(id);
    if (!existing) {
      throw new Error("Criteria not found");
    }

    // If updating code, check for uniqueness
    if (data.code && data.code !== existing.code) {
      const codeExists = await this.repository.findCriteriaByCode(data.code);
      if (codeExists) {
        throw new Error("Criteria code already exists");
      }
    }

    return this.repository.updateCriteria(id, data);
  }

  /**
   * Soft delete criteria (admin only)
   */
  async deleteCriteria(id: string): Promise<void> {
    const existing = await this.repository.findCriteriaById(id);
    if (!existing) {
      throw new Error("Criteria not found");
    }

    return this.repository.deleteCriteria(id);
  }

  // ==================== VOTING ====================

  /**
   * Submit votes for a match
   * Validates:
   * - All criteria exist and are active
   * - Voted-for users are different for each criteria (exclusive selection)
   * - Voter is signed up for the match (could be validated externally)
   */
  async submitVotes(
    matchId: string,
    voterUserId: string,
    votes: { criteriaId: string; votedForUserId: string }[],
  ): Promise<MatchVote[]> {
    // Validate all criteria exist and are active
    const activeCriteria = await this.repository.findAllCriteria(true);
    const activeCriteriaIds = new Set(activeCriteria.map((c) => c.id));

    for (const vote of votes) {
      if (!activeCriteriaIds.has(vote.criteriaId)) {
        throw new Error(`Invalid or inactive criteria: ${vote.criteriaId}`);
      }
    }

    // Validate exclusive selection: each voted-for user can only be selected once
    const votedForUsers = new Set<string>();
    for (const vote of votes) {
      if (votedForUsers.has(vote.votedForUserId)) {
        throw new Error("Each player can only be voted for one category per submission");
      }
      votedForUsers.add(vote.votedForUserId);
    }

    // Submit all votes
    return this.repository.submitVotes(matchId, voterUserId, votes);
  }

  /**
   * Get user's votes for a match
   */
  async getUserVotesForMatch(matchId: string, userId: string): Promise<UserMatchVotes> {
    return this.repository.findUserVotesForMatch(matchId, userId);
  }

  /**
   * Get voting results for a match
   */
  async getMatchVotingResults(
    matchId: string,
    language: "en" | "es" = "en",
  ): Promise<MatchVotingResults> {
    return this.repository.getMatchVotingResults(matchId, language);
  }

  /**
   * Check if a user has voted for a match
   */
  async hasUserVotedForMatch(matchId: string, userId: string): Promise<boolean> {
    return this.repository.hasUserVotedForMatch(matchId, userId);
  }

  /**
   * Clear user's votes for a match (allows re-voting)
   */
  async clearUserVotesForMatch(matchId: string, userId: string): Promise<void> {
    return this.repository.deleteUserVotesForMatch(matchId, userId);
  }

  async getMatchStats(match: Match, language: "en" | "es" = "en"): Promise<MatchStats> {
    const matchId = match.id;
    const votingAutoCloseAt = computeVotingAutoCloseAt(match.date, VOTING_AUTO_CLOSE_DAYS);
    const votingClosedAt = match.votingClosedAt;
    const isVotingClosed = votingClosedAt !== null || new Date().toISOString() >= votingAutoCloseAt;

    if (!isVotingClosed) {
      return {
        matchId,
        isVotingClosed: false,
        votingAutoCloseAt,
        votingClosedAt,
        totalVoters: 0,
        eligibleVoterCount: 0,
        results: [],
        playerStats: [],
      };
    }

    const [results, playerStats, eligibleVoterCount] = await Promise.all([
      this.repository.getMatchVotingResults(matchId, language),
      this.repository.getMatchPlayerSocialStats(matchId),
      this.repository.getEligibleVoterCount(matchId),
    ]);

    return {
      matchId,
      isVotingClosed: true,
      votingAutoCloseAt,
      votingClosedAt,
      totalVoters: results.totalVoters,
      eligibleVoterCount,
      results: results.results,
      playerStats,
    };
  }

  async setMatchVotingState(matchId: string, closed: boolean): Promise<void> {
    await this.repository.setMatchVotingClosedAt(matchId, closed ? new Date().toISOString() : null);
  }
}

// Export a singleton instance
export const votingService = new VotingService();
