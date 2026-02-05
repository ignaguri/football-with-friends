// Voting Repository for match voting system

import { sql } from "kysely";
import { getDatabase } from "../database/connection";
import type {
  VotingCriteria,
  MatchVote,
  CreateVoteData,
  LocalizedVotingCriteria,
  UserMatchVotes,
  CriteriaVoteResult,
  MatchVotingResults,
  PlayerVotingStats,
  VotingLeaderboard,
  PlayerRanking,
} from "../domain/types";

const { nanoid } = require("nanoid");

// Transform database row to VotingCriteria domain object
function toVotingCriteria(row: any): VotingCriteria {
  return {
    id: row.id,
    code: row.code,
    nameEn: row.name_en,
    nameEs: row.name_es,
    descriptionEn: row.description_en || undefined,
    descriptionEs: row.description_es || undefined,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Transform database row to MatchVote domain object
function toMatchVote(row: any): MatchVote {
  return {
    id: row.id,
    matchId: row.match_id,
    voterUserId: row.voter_user_id,
    criteriaId: row.criteria_id,
    votedForUserId: row.voted_for_user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Get localized criteria based on language
function toLocalizedCriteria(
  criteria: VotingCriteria,
  language: "en" | "es"
): LocalizedVotingCriteria {
  return {
    id: criteria.id,
    code: criteria.code,
    name: language === "es" ? criteria.nameEs : criteria.nameEn,
    description:
      language === "es" ? criteria.descriptionEs : criteria.descriptionEn,
    isActive: criteria.isActive,
    sortOrder: criteria.sortOrder,
  };
}

export class VotingRepository {
  // ==================== VOTING CRITERIA ====================

  /**
   * Get all voting criteria (optionally filtered by active status)
   */
  async findAllCriteria(activeOnly = true): Promise<VotingCriteria[]> {
    const db = getDatabase();
    let query = db
      .selectFrom("voting_criteria")
      .selectAll()
      .orderBy("sort_order", "asc");

    if (activeOnly) {
      query = query.where("is_active", "=", 1);
    }

    const rows = await query.execute();
    return rows.map(toVotingCriteria);
  }

  /**
   * Get localized voting criteria for API response
   */
  async findAllCriteriaLocalized(
    language: "en" | "es",
    activeOnly = true
  ): Promise<LocalizedVotingCriteria[]> {
    const criteria = await this.findAllCriteria(activeOnly);
    return criteria.map((c) => toLocalizedCriteria(c, language));
  }

  /**
   * Find criteria by ID
   */
  async findCriteriaById(id: string): Promise<VotingCriteria | null> {
    const db = getDatabase();
    const row = await db
      .selectFrom("voting_criteria")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return row ? toVotingCriteria(row) : null;
  }

  /**
   * Find criteria by code
   */
  async findCriteriaByCode(code: string): Promise<VotingCriteria | null> {
    const db = getDatabase();
    const row = await db
      .selectFrom("voting_criteria")
      .selectAll()
      .where("code", "=", code)
      .executeTakeFirst();

    return row ? toVotingCriteria(row) : null;
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
    const db = getDatabase();
    const id = `vc_${nanoid(12)}`;
    const now = new Date().toISOString();

    await db
      .insertInto("voting_criteria")
      .values({
        id,
        code: data.code,
        name_en: data.nameEn,
        name_es: data.nameEs,
        description_en: data.descriptionEn || null,
        description_es: data.descriptionEs || null,
        is_active: 1,
        sort_order: data.sortOrder ?? 0,
        created_at: now,
        updated_at: now,
      })
      .execute();

    const created = await this.findCriteriaById(id);
    if (!created) {
      throw new Error("Failed to create voting criteria");
    }
    return created;
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
    }
  ): Promise<VotingCriteria> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateData: Record<string, any> = {
      updated_at: now,
    };

    if (data.code !== undefined) updateData.code = data.code;
    if (data.nameEn !== undefined) updateData.name_en = data.nameEn;
    if (data.nameEs !== undefined) updateData.name_es = data.nameEs;
    if (data.descriptionEn !== undefined)
      updateData.description_en = data.descriptionEn;
    if (data.descriptionEs !== undefined)
      updateData.description_es = data.descriptionEs;
    if (data.isActive !== undefined) updateData.is_active = data.isActive ? 1 : 0;
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

    await db
      .updateTable("voting_criteria")
      .set(updateData)
      .where("id", "=", id)
      .execute();

    const updated = await this.findCriteriaById(id);
    if (!updated) {
      throw new Error("Voting criteria not found");
    }
    return updated;
  }

  /**
   * Soft delete criteria (set is_active = 0)
   */
  async deleteCriteria(id: string): Promise<void> {
    const db = getDatabase();
    await db
      .updateTable("voting_criteria")
      .set({
        is_active: 0,
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .execute();
  }

  // ==================== MATCH VOTES ====================

  /**
   * Submit or update a vote for a criteria in a match
   */
  async submitVote(data: CreateVoteData): Promise<MatchVote> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Validate that the voted-for user exists in the user table
    const votedForUser = await db
      .selectFrom("user")
      .select("id")
      .where("id", "=", data.votedForUserId)
      .executeTakeFirst();

    if (!votedForUser) {
      throw new Error(
        `Cannot vote for user ${data.votedForUserId}: user does not exist. Guests cannot receive votes.`
      );
    }

    // Check if vote already exists for this voter/criteria combo
    const existing = await db
      .selectFrom("match_votes")
      .select("id")
      .where("match_id", "=", data.matchId)
      .where("voter_user_id", "=", data.voterUserId)
      .where("criteria_id", "=", data.criteriaId)
      .executeTakeFirst();

    if (existing) {
      // Update existing vote
      await db
        .updateTable("match_votes")
        .set({
          voted_for_user_id: data.votedForUserId,
          updated_at: now,
        })
        .where("id", "=", existing.id)
        .execute();

      return (await this.findVoteById(existing.id))!;
    } else {
      // Create new vote
      const id = `mv_${nanoid(12)}`;

      await db
        .insertInto("match_votes")
        .values({
          id,
          match_id: data.matchId,
          voter_user_id: data.voterUserId,
          criteria_id: data.criteriaId,
          voted_for_user_id: data.votedForUserId,
          created_at: now,
          updated_at: now,
        })
        .execute();

      return (await this.findVoteById(id))!;
    }
  }

  /**
   * Submit multiple votes at once (upsert)
   */
  async submitVotes(
    matchId: string,
    voterUserId: string,
    votes: { criteriaId: string; votedForUserId: string }[]
  ): Promise<MatchVote[]> {
    const results: MatchVote[] = [];

    for (const vote of votes) {
      const result = await this.submitVote({
        matchId,
        voterUserId,
        criteriaId: vote.criteriaId,
        votedForUserId: vote.votedForUserId,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Find a vote by ID
   */
  async findVoteById(id: string): Promise<MatchVote | null> {
    const db = getDatabase();
    const row = await db
      .selectFrom("match_votes")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return row ? toMatchVote(row) : null;
  }

  /**
   * Get all votes by a user for a match
   */
  async findUserVotesForMatch(
    matchId: string,
    userId: string
  ): Promise<UserMatchVotes> {
    const db = getDatabase();
    const rows = await db
      .selectFrom("match_votes")
      .select(["criteria_id", "voted_for_user_id"])
      .where("match_id", "=", matchId)
      .where("voter_user_id", "=", userId)
      .execute();

    return {
      matchId,
      voterUserId: userId,
      votes: rows.map((r) => ({
        criteriaId: r.criteria_id,
        votedForUserId: r.voted_for_user_id,
      })),
    };
  }

  /**
   * Get voting results for a match
   */
  async getMatchVotingResults(
    matchId: string,
    language: "en" | "es" = "en"
  ): Promise<MatchVotingResults> {
    const db = getDatabase();

    // Get unique voters count
    const votersResult = await db
      .selectFrom("match_votes")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("match_id", "=", matchId)
      .groupBy("voter_user_id")
      .execute();

    const totalVoters = votersResult.length;

    // Get vote counts per criteria and voted_for_user
    const results = await db
      .selectFrom("match_votes")
      .innerJoin("voting_criteria", "voting_criteria.id", "match_votes.criteria_id")
      .innerJoin("user", "user.id", "match_votes.voted_for_user_id")
      .select([
        "match_votes.criteria_id",
        "voting_criteria.code as criteria_code",
        language === "es"
          ? "voting_criteria.name_es as criteria_name"
          : "voting_criteria.name_en as criteria_name",
        "match_votes.voted_for_user_id",
        "user.name as voted_for_user_name",
        (eb) => eb.fn.countAll<number>().as("vote_count"),
      ])
      .where("match_votes.match_id", "=", matchId)
      .groupBy([
        "match_votes.criteria_id",
        "match_votes.voted_for_user_id",
        "voting_criteria.code",
        "criteria_name",
        "user.name",
      ])
      .orderBy("vote_count", "desc")
      .execute();

    return {
      matchId,
      totalVoters,
      results: results.map((r) => ({
        criteriaId: r.criteria_id,
        criteriaCode: r.criteria_code,
        criteriaName: r.criteria_name,
        votedForUserId: r.voted_for_user_id,
        votedForUserName: r.voted_for_user_name || "Unknown",
        voteCount: Number(r.vote_count),
      })),
    };
  }

  /**
   * Delete a specific vote
   */
  async deleteVote(id: string): Promise<void> {
    const db = getDatabase();
    await db.deleteFrom("match_votes").where("id", "=", id).execute();
  }

  /**
   * Delete all votes by a user for a match
   */
  async deleteUserVotesForMatch(
    matchId: string,
    userId: string
  ): Promise<void> {
    const db = getDatabase();
    await db
      .deleteFrom("match_votes")
      .where("match_id", "=", matchId)
      .where("voter_user_id", "=", userId)
      .execute();
  }

  /**
   * Check if a user has voted for a specific match
   */
  async hasUserVotedForMatch(matchId: string, userId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db
      .selectFrom("match_votes")
      .select("id")
      .where("match_id", "=", matchId)
      .where("voter_user_id", "=", userId)
      .executeTakeFirst();

    return !!result;
  }

  // ==================== RANKING & LEADERBOARDS ====================

  /**
   * Get voting statistics for a specific player across all matches
   */
  async getPlayerVotingStats(
    userId: string,
    language: "en" | "es" = "en"
  ): Promise<PlayerVotingStats> {
    const db = getDatabase();

    const nameColumn = language === "es" ? "vc.name_es" : "vc.name_en";

    const rows = await sql<{
      criteria_id: string;
      criteria_code: string;
      criteria_name: string;
      vote_count: number;
      rank: number;
    }>`
      SELECT
        mv.criteria_id,
        vc.code as criteria_code,
        ${sql.raw(nameColumn)} as criteria_name,
        COUNT(*) as vote_count,
        ROW_NUMBER() OVER (PARTITION BY mv.criteria_id ORDER BY COUNT(*) DESC) as rank
      FROM match_votes mv
      INNER JOIN voting_criteria vc ON mv.criteria_id = vc.id
      WHERE mv.voted_for_user_id = ${userId} AND vc.is_active = 1
      GROUP BY mv.criteria_id, vc.code, criteria_name
      ORDER BY vote_count DESC
    `.execute(db);

    const totalVotes = rows.rows.reduce(
      (sum, row) => sum + Number(row.vote_count),
      0
    );

    return {
      userId,
      totalVotesReceived: totalVotes,
      criteriaBreakdown: rows.rows.map((row) => ({
        criteriaId: row.criteria_id,
        criteriaCode: row.criteria_code,
        criteriaName: row.criteria_name,
        timesVoted: Number(row.vote_count),
        rank: Number(row.rank),
      })),
    };
  }

  /**
   * Get voting leaderboard (top N players per criteria across all matches)
   */
  async getVotingLeaderboard(
    language: "en" | "es" = "en",
    topN: number = 3
  ): Promise<VotingLeaderboard> {
    const db = getDatabase();

    const nameColumn = language === "es" ? "vc.name_es" : "vc.name_en";
    const descriptionColumn = language === "es" ? "vc.description_es" : "vc.description_en";

    const rows = await sql<{
      criteria_id: string;
      criteria_code: string;
      criteria_name: string;
      criteria_description: string | null;
      sort_order: number;
      voted_for_user_id: string;
      user_name: string;
      nationality: string | null;
      profile_picture: string | null;
      vote_count: number;
      rank: number;
    }>`
      WITH ranked_votes AS (
        SELECT
          vc.id as criteria_id,
          vc.code as criteria_code,
          ${sql.raw(nameColumn)} as criteria_name,
          ${sql.raw(descriptionColumn)} as criteria_description,
          vc.sort_order,
          mv.voted_for_user_id,
          u.name as user_name,
          u.nationality,
          u.profilePicture as profile_picture,
          COUNT(*) as vote_count,
          ROW_NUMBER() OVER (PARTITION BY vc.id ORDER BY COUNT(*) DESC) as rank
        FROM voting_criteria vc
        INNER JOIN match_votes mv ON vc.id = mv.criteria_id
        INNER JOIN user u ON mv.voted_for_user_id = u.id
        WHERE vc.is_active = 1
        GROUP BY vc.id, vc.code, criteria_name, criteria_description, vc.sort_order, mv.voted_for_user_id, u.name, u.nationality, u.profilePicture
      )
      SELECT *
      FROM ranked_votes
      WHERE rank <= ${topN}
      ORDER BY sort_order ASC, rank ASC
    `.execute(db);

    // Group results by criteria
    const criteriaMap = new Map<string, any>();

    for (const row of rows.rows) {
      if (!criteriaMap.has(row.criteria_id)) {
        criteriaMap.set(row.criteria_id, {
          criteriaId: row.criteria_id,
          criteriaCode: row.criteria_code,
          criteriaName: row.criteria_name,
          criteriaDescription: row.criteria_description || row.criteria_code,
          topPlayers: [],
        });
      }

      criteriaMap.get(row.criteria_id)!.topPlayers.push({
        userId: row.voted_for_user_id,
        userName: row.user_name || "Unknown",
        nationality: row.nationality || undefined,
        profilePicture: row.profile_picture || undefined,
        voteCount: Number(row.vote_count),
      });
    }

    return {
      criteria: Array.from(criteriaMap.values()),
    };
  }

  /**
   * Get player rankings by total votes received across all criteria
   */
  async getRankingsByTotalVotes(limit: number): Promise<PlayerRanking[]> {
    const db = getDatabase();

    const rows = await sql<{
      user_id: string;
      user_name: string;
      user_email: string;
      nationality: string | null;
      profile_picture: string | null;
      total_votes: number;
      rank: number;
    }>`
      SELECT
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.nationality,
        u.profilePicture as profile_picture,
        COUNT(mv.id) as total_votes,
        ROW_NUMBER() OVER (ORDER BY COUNT(mv.id) DESC, u.name ASC) as rank
      FROM user u
      INNER JOIN match_votes mv ON u.id = mv.voted_for_user_id
      GROUP BY u.id
      ORDER BY rank ASC
      LIMIT ${limit}
    `.execute(db);

    return rows.rows.map((row) => ({
      rank: Number(row.rank),
      userId: row.user_id,
      userName: row.user_name || row.user_email,
      userEmail: row.user_email,
      nationality: row.nationality || undefined,
      profilePicture: row.profile_picture || undefined,
      value: Number(row.total_votes),
    }));
  }
}

// Export a singleton instance
export const votingRepository = new VotingRepository();
