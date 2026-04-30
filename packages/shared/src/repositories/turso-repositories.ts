// Turso/LibSQL implementation of repository interfaces using Kysely

import { format } from "date-fns";
import { sql } from "kysely";
import { nanoid } from "nanoid";

import type {
  LocationRepository,
  CourtRepository,
  MatchRepository,
  SignupRepository,
  MatchInvitationRepository,
  PlayerStatsRepository,
} from "./interfaces";
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
  PlayerStatus,
  MediaKind,
  ReactionEmoji,
} from "../domain/types";

import { getDatabase } from "../database/connection";

// Helper function to generate IDs using nanoid
function generateId(): string {
  return nanoid();
}

// Post-Phase-1 every scoped row has group_id set. We assert here rather than
// widening the domain type because any legacy NULL would indicate a migration
// slip we want to catch loudly instead of silently propagating `null` as a
// string-typed `groupId` (would bypass cross-group checks downstream).
function assertGroupId(value: unknown, table: string, id: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Invariant violation: ${table} row ${String(id) || "(unknown id)"} has a missing group_id; check Phase 1 backfill.`,
    );
  }
  return value;
}

function dbLocationToLocation(row: any): Location {
  return {
    id: row.id,
    groupId: assertGroupId(row.group_id, "locations", row.id),
    name: row.name,
    address: row.address || "",
    coordinates: row.coordinates || "",
    courtCount: row.court_count,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function dbCourtToCourt(row: any): Court {
  return {
    id: row.id,
    groupId: assertGroupId(row.group_id, "courts", row.id),
    locationId: row.location_id,
    name: row.name,
    description: row.description || "",
    isActive: Boolean(row.is_active),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function dbMatchToMatch(row: any): Match {
  return {
    id: row.id,
    groupId: assertGroupId(row.group_id, "matches", row.id),
    locationId: row.location_id,
    courtId: row.court_id || undefined,
    date: row.date,
    time: row.time,
    status: row.status,
    maxPlayers: row.max_players,
    maxSubstitutes: row.max_substitutes || 0,
    costPerPlayer: row.cost_per_player,
    sameDayCost: row.same_day_cost,
    createdByUserId: row.created_by_user_id,
    votingClosedAt: row.voting_closed_at ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Helper function to convert database row with court and location data to match domain object
function dbMatchWithCourtToMatch(row: any): Match {
  const match = dbMatchToMatch(row);

  if (row.court_name) {
    match.court = {
      id: row.court_id,
      groupId: assertGroupId(row.court_group_id, "courts", row.court_id),
      locationId: row.location_id,
      name: row.court_name,
      description: row.court_description || "",
      isActive: Boolean(row.court_is_active),
      createdAt: new Date(row.court_created_at),
      updatedAt: new Date(row.court_updated_at),
    };
  }

  if (row.location_name) {
    match.location = {
      id: row.location_id,
      groupId: assertGroupId(
        row.location_group_id,
        "locations",
        row.location_id,
      ),
      name: row.location_name,
      address: row.location_address || "",
      coordinates: row.location_coordinates || "",
      courtCount: row.location_court_count || 1,
      createdAt: new Date(row.location_created_at),
      updatedAt: new Date(row.location_updated_at),
    };
  }

  return match;
}

function dbSignupToSignup(row: any): Signup {
  return {
    id: row.id,
    groupId: assertGroupId(row.group_id, "signups", row.id),
    matchId: row.match_id,
    userId: row.user_id,
    playerName: row.player_name,
    playerEmail: row.player_email,
    status: row.status as PlayerStatus,
    signupType: row.signup_type,
    guestOwnerId: row.guest_owner_id,
    rosterId: row.roster_id ?? undefined,
    addedByUserId: row.added_by_user_id,
    signedUpAt: new Date(row.signed_up_at),
    updatedAt: new Date(row.updated_at),
  };
}

function dbInvitationToInvitation(row: any): MatchInvitation {
  return {
    id: row.id,
    matchId: row.match_id,
    email: row.email,
    invitedByUserId: row.invited_by_user_id,
    status: row.status,
    invitedAt: new Date(row.invited_at),
    respondedAt: row.responded_at ? new Date(row.responded_at) : undefined,
  };
}

// Turso Location Repository
export class TursoLocationRepository implements LocationRepository {
  private db = getDatabase();

  async findAll(groupId: string): Promise<Location[]> {
    const rows = await this.db
      .selectFrom("locations")
      .selectAll()
      .where("group_id", "=", groupId)
      .orderBy("name", "asc")
      .execute();

    return rows.map(dbLocationToLocation);
  }

  async findById(id: string): Promise<Location | null> {
    const row = await this.db
      .selectFrom("locations")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return row ? dbLocationToLocation(row) : null;
  }

  async create(locationData: CreateLocationData): Promise<Location> {
    const id = generateId();
    const now = new Date().toISOString();

    const newLocation = {
      id,
      group_id: locationData.groupId,
      name: locationData.name,
      address: locationData.address || null,
      coordinates: locationData.coordinates || null,
      court_count: locationData.courtCount || 1,
      created_at: now,
      updated_at: now,
    };

    await this.db.insertInto("locations").values(newLocation).execute();

    return dbLocationToLocation(newLocation);
  }

  async update(id: string, updates: UpdateLocationData): Promise<Location> {
    const now = new Date().toISOString();

    await this.db
      .updateTable("locations")
      .set({
        ...(updates.name && { name: updates.name }),
        ...(updates.address !== undefined && { address: updates.address }),
        ...(updates.coordinates !== undefined && {
          coordinates: updates.coordinates,
        }),
        ...(updates.courtCount !== undefined && {
          court_count: updates.courtCount,
        }),
        updated_at: now,
      })
      .where("id", "=", id)
      .execute();

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error("Location not found after update");
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom("locations").where("id", "=", id).execute();
  }
}

// Turso Court Repository
export class TursoCourtRepository implements CourtRepository {
  private db = getDatabase();

  async findAll(groupId: string): Promise<Court[]> {
    const rows = await this.db
      .selectFrom("courts")
      .selectAll()
      .where("group_id", "=", groupId)
      .orderBy("location_id", "asc")
      .orderBy("name", "asc")
      .execute();

    return rows.map(dbCourtToCourt);
  }

  async findByLocationId(
    groupId: string,
    locationId: string,
  ): Promise<Court[]> {
    const rows = await this.db
      .selectFrom("courts")
      .selectAll()
      .where("group_id", "=", groupId)
      .where("location_id", "=", locationId)
      .orderBy("name", "asc")
      .execute();

    return rows.map(dbCourtToCourt);
  }

  async findActiveByLocationId(
    groupId: string,
    locationId: string,
  ): Promise<Court[]> {
    const rows = await this.db
      .selectFrom("courts")
      .selectAll()
      .where("group_id", "=", groupId)
      .where("location_id", "=", locationId)
      .where("is_active", "=", true)
      .orderBy("name", "asc")
      .execute();

    return rows.map(dbCourtToCourt);
  }

  async findById(id: string): Promise<Court | null> {
    const row = await this.db
      .selectFrom("courts")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return row ? dbCourtToCourt(row) : null;
  }

  async findByIdWithLocation(id: string): Promise<Court | null> {
    const row = await this.db
      .selectFrom("courts")
      .leftJoin("locations", "courts.location_id", "locations.id")
      .select([
        "courts.id",
        "courts.group_id",
        "courts.location_id",
        "courts.name",
        "courts.description",
        "courts.is_active",
        "courts.created_at",
        "courts.updated_at",
        "locations.id as location_id",
        "locations.group_id as location_group_id",
        "locations.name as location_name",
        "locations.address as location_address",
        "locations.coordinates as location_coordinates",
        "locations.court_count as location_court_count",
        "locations.created_at as location_created_at",
        "locations.updated_at as location_updated_at",
      ])
      .where("courts.id", "=", id)
      .executeTakeFirst();

    if (!row) return null;

    const court = dbCourtToCourt(row);
    if (row.location_id) {
      court.location = {
        id: row.location_id,
        // group_id is nullable in the schema (see Phase 1 NOT NULL tightening
        // deferral in the plan doc) but always populated post-backfill;
        // fall back to the court's group if somehow missing.
        groupId: row.location_group_id ?? court.groupId,
        name: row.location_name || "Unknown Location",
        address: row.location_address || "",
        coordinates: row.location_coordinates || "",
        courtCount: row.location_court_count || 1,
        createdAt: new Date(row.location_created_at || new Date()),
        updatedAt: new Date(row.location_updated_at || new Date()),
      };
    }

    return court;
  }

  async create(court: CreateCourtData): Promise<Court> {
    const id = generateId();
    const now = new Date().toISOString();

    const newCourt = {
      id,
      group_id: court.groupId,
      location_id: court.locationId,
      name: court.name,
      description: court.description || null,
      is_active: court.isActive ?? true,
      created_at: now,
      updated_at: now,
    };

    await this.db.insertInto("courts").values(newCourt).execute();

    return dbCourtToCourt(newCourt);
  }

  async update(id: string, updates: UpdateCourtData): Promise<Court> {
    const now = new Date().toISOString();
    const updateData: any = {
      updated_at: now,
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    await this.db
      .updateTable("courts")
      .set(updateData)
      .where("id", "=", id)
      .execute();

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Court with id ${id} not found after update`);
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom("courts").where("id", "=", id).execute();
  }

  async existsByName(
    locationId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    let query = this.db
      .selectFrom("courts")
      .select("id")
      .where("location_id", "=", locationId)
      .where("name", "=", name);

    if (excludeId) {
      query = query.where("id", "!=", excludeId);
    }

    const row = await query.executeTakeFirst();
    return !!row;
  }

  async getCountByLocationId(locationId: string): Promise<number> {
    const result = await this.db
      .selectFrom("courts")
      .select((eb) => eb.fn.count("id").as("count"))
      .where("location_id", "=", locationId)
      .executeTakeFirst();

    return Number(result?.count || 0);
  }
}

// Turso Match Repository
export class TursoMatchRepository implements MatchRepository {
  private db = getDatabase();

  async findAll(
    filters?: MatchFilters & { limit?: number; offset?: number },
  ): Promise<{ matches: Match[]; total: number }> {
    // Build the base query for filtering and counting
    let baseQuery = this.db.selectFrom("matches");

    if (filters?.groupId) {
      baseQuery = baseQuery.where("matches.group_id", "=", filters.groupId);
    }

    if (filters?.status) {
      baseQuery = baseQuery.where("matches.status", "=", filters.status);
    }

    if (filters?.type) {
      const today = format(new Date(), "yyyy-MM-dd"); // YYYY-MM-DD
      if (filters.type === "past") {
        baseQuery = baseQuery.where((eb) =>
          eb.or([
            eb("matches.date", "<", today),
            eb("matches.status", "=", "cancelled"),
          ]),
        );
      } else if (filters.type === "upcoming") {
        baseQuery = baseQuery
          .where("matches.date", ">=", today)
          .where("matches.status", "!=", "cancelled");
      }
    }

    if (filters?.locationId) {
      baseQuery = baseQuery.where(
        "matches.location_id",
        "=",
        filters.locationId,
      );
    }

    if (filters?.dateFrom) {
      baseQuery = baseQuery.where("matches.date", ">=", filters.dateFrom);
    }

    if (filters?.dateTo) {
      baseQuery = baseQuery.where("matches.date", "<=", filters.dateTo);
    }

    // Get total count
    const countResult = await baseQuery
      .select((eb) => eb.fn.count("matches.id").as("total"))
      .executeTakeFirst();
    const total = Number(countResult?.total || 0);

    // Build the data query with joins
    let dataQuery = baseQuery
      .leftJoin("courts", "matches.court_id", "courts.id")
      .leftJoin("locations", "matches.location_id", "locations.id")
      .select([
        "matches.id",
        "matches.group_id",
        "matches.location_id",
        "matches.court_id",
        "matches.date",
        "matches.time",
        "matches.status",
        "matches.max_players",
        "matches.max_substitutes",
        "matches.cost_per_player",
        "matches.same_day_cost",
        "matches.created_by_user_id",
        "matches.voting_closed_at",
        "matches.created_at",
        "matches.updated_at",
        "courts.id as court_id",
        "courts.group_id as court_group_id",
        "courts.name as court_name",
        "courts.description as court_description",
        "courts.is_active as court_is_active",
        "courts.created_at as court_created_at",
        "courts.updated_at as court_updated_at",
        "locations.id as location_id",
        "locations.group_id as location_group_id",
        "locations.name as location_name",
        "locations.address as location_address",
        "locations.coordinates as location_coordinates",
        "locations.court_count as location_court_count",
        "locations.created_at as location_created_at",
        "locations.updated_at as location_updated_at",
      ]);

    const sortDir = filters?.sortDirection ?? "asc";
    dataQuery = dataQuery
      .orderBy("matches.date", sortDir)
      .orderBy("matches.time", sortDir);

    // Apply pagination
    if (filters?.limit) {
      dataQuery = dataQuery.limit(filters.limit);
    }

    if (filters?.offset) {
      dataQuery = dataQuery.offset(filters.offset);
    }

    const rows = await dataQuery.execute();
    const matches = rows.map(dbMatchWithCourtToMatch);

    // If userId is provided, fetch user's signup status for each match
    if (filters?.userId && matches.length > 0) {
      const matchIds = matches.map((m) => m.id);
      const userSignups = await this.db
        .selectFrom("signups")
        .select(["match_id", "status"])
        .where("match_id", "in", matchIds)
        .where("user_id", "=", filters.userId)
        .execute();

      // Create a map of matchId -> status
      const signupMap = new Map(
        userSignups.map((s) => [s.match_id, s.status as PlayerStatus]),
      );

      // Attach user signup status to each match
      for (const match of matches) {
        (match as any).userSignupStatus = signupMap.get(match.id) || null;
      }
    }

    return { matches, total };
  }

  async findById(id: string): Promise<Match | null> {
    const row = await this.db
      .selectFrom("matches")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return row ? dbMatchToMatch(row) : null;
  }

  async findByIdWithDetails(
    id: string,
    userId?: string,
  ): Promise<MatchDetails | null> {
    const match = await this.findById(id);
    if (!match) return null;

    // Get location
    const location = await this.db
      .selectFrom("locations")
      .selectAll()
      .where("id", "=", match.locationId)
      .executeTakeFirst();

    if (!location) {
      throw new Error("Location not found for match");
    }

    // Get court if courtId exists
    let court = null;
    if (match.courtId) {
      const courtRow = await this.db
        .selectFrom("courts")
        .selectAll()
        .where("id", "=", match.courtId)
        .executeTakeFirst();

      if (courtRow) {
        court = dbCourtToCourt(courtRow);
      }
    }

    // Get signups with guest owner information and user nationality
    const signupRows = await this.db
      .selectFrom("signups")
      .leftJoin(
        "user as guest_owner",
        "signups.guest_owner_id",
        "guest_owner.id",
      )
      .leftJoin("user as player_user", "signups.user_id", "player_user.id")
      .select([
        "signups.id",
        "signups.group_id",
        "signups.match_id",
        "signups.user_id",
        "signups.player_name",
        "signups.player_email",
        "signups.status",
        "signups.signup_type",
        "signups.guest_owner_id",
        "signups.roster_id",
        "signups.added_by_user_id",
        "signups.signed_up_at",
        "signups.updated_at",
        "guest_owner.email as guest_owner_email",
        "player_user.nationality as player_nationality",
        "player_user.username as player_username",
        "player_user.displayUsername as player_display_username",
      ])
      .where("match_id", "=", id)
      .orderBy("signed_up_at", "asc")
      .execute();

    const signups = signupRows.map((row) => ({
      ...dbSignupToSignup(row),
      guestOwnerEmail: row.guest_owner_email || undefined,
      playerNationality: row.player_nationality || undefined,
      playerUsername: row.player_username || null,
      playerDisplayUsername: row.player_display_username || null,
    }));

    // Calculate available spots (based on paid players only)
    const paidSignupsCount = signups.filter((s) => s.status === "PAID").length;
    const availableSpots = Math.max(0, match.maxPlayers - paidSignupsCount);

    // Check if user is signed up
    const isUserSignedUp = userId
      ? signups.some((s) => s.userId === userId)
      : undefined;
    const userSignup = userId
      ? signups.find((s) => s.userId === userId)
      : undefined;

    return {
      ...match,
      location: dbLocationToLocation(location),
      court: court || undefined,
      signups,
      createdByUser: {
        id: match.createdByUserId,
        name: "Admin", // TODO: Get from BetterAuth user table
        email: "",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      availableSpots,
      isUserSignedUp,
      userSignup,
    };
  }

  async create(matchData: CreateMatchData): Promise<Match> {
    const id = generateId();
    const now = new Date().toISOString();

    const newMatch = {
      id,
      group_id: matchData.groupId,
      location_id: matchData.locationId,
      court_id: matchData.courtId || null,
      date: matchData.date,
      time: matchData.time,
      status: "upcoming" as const,
      max_players: matchData.maxPlayers || 10,
      max_substitutes: matchData.maxSubstitutes || 2,
      cost_per_player: matchData.costPerPlayer || null,
      same_day_cost: matchData.sameDayCost || null,
      created_by_user_id: matchData.createdByUserId,
      created_at: now,
      updated_at: now,
    };

    await this.db.insertInto("matches").values(newMatch).execute();

    return dbMatchToMatch(newMatch);
  }

  async update(id: string, updates: UpdateMatchData): Promise<Match> {
    const now = new Date().toISOString();

    await this.db
      .updateTable("matches")
      .set({
        ...(updates.locationId && { location_id: updates.locationId }),
        ...(updates.courtId !== undefined && { court_id: updates.courtId }),
        ...(updates.date && { date: updates.date }),
        ...(updates.time && { time: updates.time }),
        ...(updates.status && { status: updates.status }),
        ...(updates.maxPlayers !== undefined && {
          max_players: updates.maxPlayers,
        }),
        ...(updates.costPerPlayer !== undefined && {
          cost_per_player: updates.costPerPlayer,
        }),
        ...(updates.maxSubstitutes !== undefined && {
          max_substitutes: updates.maxSubstitutes,
        }),
        ...(updates.sameDayCost !== undefined && {
          same_day_cost: updates.sameDayCost,
        }),
        updated_at: now,
      })
      .where("id", "=", id)
      .execute();

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error("Match not found after update");
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    // Cascade delete will handle signups and invitations
    await this.db.deleteFrom("matches").where("id", "=", id).execute();
  }

  async existsOnDate(groupId: string, date: string): Promise<boolean> {
    const result = await this.db
      .selectFrom("matches")
      .select(sql`1`.as("exists"))
      .where("group_id", "=", groupId)
      .where("date", "=", date)
      .executeTakeFirst();

    return Boolean(result);
  }
}

// Turso Signup Repository
export class TursoSignupRepository implements SignupRepository {
  private db = getDatabase();

  async findAll(filters?: SignupFilters): Promise<Signup[]> {
    let query = this.db
      .selectFrom("signups")
      .selectAll()
      .orderBy("signed_up_at", "asc");

    if (filters?.groupId) {
      query = query.where("group_id", "=", filters.groupId);
    }

    if (filters?.matchId) {
      query = query.where("match_id", "=", filters.matchId);
    }

    if (filters?.userId) {
      query = query.where("user_id", "=", filters.userId);
    }

    if (filters?.status) {
      query = query.where("status", "=", filters.status);
    }

    if (filters?.signupType) {
      query = query.where("signup_type", "=", filters.signupType);
    }

    const rows = await query.execute();
    return rows.map(dbSignupToSignup);
  }

  async findByMatchId(matchId: string): Promise<Signup[]> {
    return this.findAll({ matchId });
  }

  async findByUserId(userId: string): Promise<Signup[]> {
    return this.findAll({ userId });
  }

  async findById(id: string): Promise<Signup | null> {
    const row = await this.db
      .selectFrom("signups")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return row ? dbSignupToSignup(row) : null;
  }

  async findByIdWithDetails(id: string): Promise<SignupWithDetails | null> {
    const signup = await this.findById(id);
    if (!signup) return null;

    // Get match details
    const matchRow = await this.db
      .selectFrom("matches")
      .selectAll()
      .where("id", "=", signup.matchId)
      .executeTakeFirst();

    if (!matchRow) {
      throw new Error("Match not found for signup");
    }

    return {
      ...signup,
      match: dbMatchToMatch(matchRow),
      addedByUser: {
        id: signup.addedByUserId,
        name: "User",
        email: signup.addedByUserId,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  async isUserSignedUp(matchId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .selectFrom("signups")
      .select(sql`1`.as("exists"))
      .where("match_id", "=", matchId)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    return Boolean(result);
  }

  async getSignupCount(matchId: string): Promise<number> {
    const result = await this.db
      .selectFrom("signups")
      .select(sql`COUNT(*)`.as("count"))
      .where("match_id", "=", matchId)
      .executeTakeFirst();

    return Number(result?.count || 0);
  }

  async getPaidSignupCount(matchId: string): Promise<number> {
    const result = await this.db
      .selectFrom("signups")
      .select(sql`COUNT(*)`.as("count"))
      .where("match_id", "=", matchId)
      .where("status", "=", "PAID")
      .executeTakeFirst();

    return Number(result?.count || 0);
  }

  async getSubstituteCount(matchId: string): Promise<number> {
    const result = await this.db
      .selectFrom("signups")
      .select(sql`COUNT(*)`.as("count"))
      .where("match_id", "=", matchId)
      .where("status", "=", "SUBSTITUTE")
      .executeTakeFirst();

    return Number(result?.count || 0);
  }

  async isMatchFull(matchId: string, maxPlayers: number): Promise<boolean> {
    const paidCount = await this.getPaidSignupCount(matchId);
    return paidCount >= maxPlayers;
  }

  async create(signupData: CreateSignupData): Promise<Signup> {
    const id = generateId();
    const now = new Date().toISOString();

    const newSignup = {
      id,
      group_id: signupData.groupId,
      match_id: signupData.matchId,
      user_id: signupData.userId || null,
      player_name: signupData.playerName,
      player_email: signupData.playerEmail,
      status: signupData.status || "PENDING",
      signup_type: signupData.signupType,
      guest_owner_id: signupData.guestOwnerId || null,
      roster_id: signupData.rosterId ?? null,
      added_by_user_id: signupData.addedByUserId,
      signed_up_at: now,
      updated_at: now,
    };

    await this.db.insertInto("signups").values(newSignup).execute();

    return dbSignupToSignup(newSignup);
  }

  async update(id: string, updates: UpdateSignupData): Promise<Signup> {
    const now = new Date().toISOString();

    await this.db
      .updateTable("signups")
      .set({
        ...(updates.userId !== undefined && { user_id: updates.userId }),
        ...(updates.playerName && { player_name: updates.playerName }),
        ...(updates.playerEmail && { player_email: updates.playerEmail }),
        ...(updates.status && { status: updates.status }),
        ...(updates.signupType && { signup_type: updates.signupType }),
        ...(updates.guestOwnerId !== undefined && {
          guest_owner_id: updates.guestOwnerId,
        }),
        updated_at: now,
      })
      .where("id", "=", id)
      .execute();

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error("Signup not found after update");
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom("signups").where("id", "=", id).execute();
  }

  async addGuest(guestData: CreateGuestSignupData): Promise<Signup> {
    const id = generateId();
    const now = new Date().toISOString();
    const playerEmail = `guest-${generateId()}@local`;

    const newSignup = {
      id,
      group_id: guestData.groupId,
      match_id: guestData.matchId,
      user_id: null,
      player_name: guestData.guestName,
      player_email: playerEmail,
      status: guestData.status || "PENDING",
      signup_type: "guest" as const,
      guest_owner_id: guestData.ownerUserId,
      added_by_user_id: guestData.ownerUserId,
      roster_id: guestData.rosterId,
      signed_up_at: now,
      updated_at: now,
    };

    await this.db.insertInto("signups").values(newSignup).execute();

    return dbSignupToSignup(newSignup);
  }

  async addPlayerAsOrganizer(
    groupId: string,
    matchId: string,
    playerData: {
      userId?: string;
      playerName: string;
      playerEmail: string;
      status?: string;
    },
    actorId: string,
  ): Promise<Signup> {
    return this.create({
      groupId,
      matchId,
      userId: playerData.userId,
      playerName: playerData.playerName,
      playerEmail: playerData.playerEmail,
      status: (playerData.status as PlayerStatus) || "PENDING",
      // DB-stored enum value kept as-is to avoid a migration; only callers
      // renamed to reflect the new organizer-scoped authorization model.
      signupType: "admin_added",
      addedByUserId: actorId,
    });
  }

  async removePlayerAsOrganizer(
    signupId: string,
    actorId: string,
  ): Promise<void> {
    console.log(`Organizer ${actorId} removing signup ${signupId}`);
    await this.delete(signupId);
  }

  async findAddedByUser(userId: string): Promise<Signup[]> {
    const rows = await this.db
      .selectFrom("signups")
      .selectAll()
      .where("added_by_user_id", "=", userId)
      .orderBy("signed_up_at", "asc")
      .execute();

    return rows.map(dbSignupToSignup);
  }

  async getSignedUpUserIds(matchId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom("signups")
      .select("user_id")
      .where("match_id", "=", matchId)
      .where("status", "!=", "CANCELLED")
      .where("user_id", "is not", null)
      .distinct()
      .execute();

    return rows.map((r) => r.user_id).filter((id): id is string => id !== null);
  }
}

// Turso Match Invitation Repository
export class TursoMatchInvitationRepository implements MatchInvitationRepository {
  private db = getDatabase();

  async findByMatchId(matchId: string): Promise<MatchInvitation[]> {
    const rows = await this.db
      .selectFrom("match_invitations")
      .selectAll()
      .where("match_id", "=", matchId)
      .orderBy("invited_at", "asc")
      .execute();

    return rows.map(dbInvitationToInvitation);
  }

  async findByInviterId(userId: string): Promise<MatchInvitation[]> {
    const rows = await this.db
      .selectFrom("match_invitations")
      .selectAll()
      .where("invited_by_user_id", "=", userId)
      .orderBy("invited_at", "asc")
      .execute();

    return rows.map(dbInvitationToInvitation);
  }

  async findByEmail(email: string): Promise<MatchInvitation[]> {
    const rows = await this.db
      .selectFrom("match_invitations")
      .selectAll()
      .where("email", "=", email)
      .orderBy("invited_at", "asc")
      .execute();

    return rows.map(dbInvitationToInvitation);
  }

  async create(invitationData: CreateInvitationData): Promise<MatchInvitation> {
    const id = generateId();
    const now = new Date().toISOString();

    const newInvitation = {
      id,
      match_id: invitationData.matchId,
      email: invitationData.email,
      invited_by_user_id: invitationData.invitedByUserId,
      status: "pending" as const,
      invited_at: now,
      responded_at: null,
    };

    await this.db
      .insertInto("match_invitations")
      .values(newInvitation)
      .execute();

    return dbInvitationToInvitation(newInvitation);
  }

  async updateStatus(
    id: string,
    status: "accepted" | "declined",
  ): Promise<MatchInvitation> {
    const now = new Date().toISOString();

    await this.db
      .updateTable("match_invitations")
      .set({
        status,
        responded_at: now,
      })
      .where("id", "=", id)
      .execute();

    const updated = await this.db
      .selectFrom("match_invitations")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!updated) {
      throw new Error("Invitation not found after update");
    }

    return dbInvitationToInvitation(updated);
  }

  async delete(id: string): Promise<void> {
    await this.db
      .deleteFrom("match_invitations")
      .where("id", "=", id)
      .execute();
  }

  async deleteExpired(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffIso = cutoffDate.toISOString();

    const result = await this.db
      .deleteFrom("match_invitations")
      .where("invited_at", "<", cutoffIso as any)
      .where("status", "=", "pending")
      .executeTakeFirst();

    return Number(result.numDeletedRows || 0);
  }
}

// Helper function to convert database row to MatchPlayerStats domain object
function dbStatsToMatchPlayerStats(row: any): MatchPlayerStats {
  return {
    id: row.id,
    groupId: assertGroupId(row.group_id, "match_player_stats", row.id),
    matchId: row.match_id,
    userId: row.user_id,
    goals: row.goals,
    thirdTimeAttended: Boolean(row.third_time_attended),
    thirdTimeBeers: row.third_time_beers,
    confirmed: Boolean(row.confirmed),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Turso Player Stats Repository
export class TursoPlayerStatsRepository implements PlayerStatsRepository {
  private db = getDatabase();

  async findByMatchAndUser(
    matchId: string,
    userId: string,
  ): Promise<MatchPlayerStats | null> {
    const row = await this.db
      .selectFrom("match_player_stats")
      .selectAll()
      .where("match_id", "=", matchId)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    return row ? dbStatsToMatchPlayerStats(row) : null;
  }

  async findByMatchId(matchId: string): Promise<MatchPlayerStats[]> {
    const rows = await this.db
      .selectFrom("match_player_stats")
      .selectAll()
      .where("match_id", "=", matchId)
      .execute();

    return rows.map(dbStatsToMatchPlayerStats);
  }

  async findByUserId(userId: string): Promise<MatchPlayerStats[]> {
    const rows = await this.db
      .selectFrom("match_player_stats")
      .innerJoin("matches", "matches.id", "match_player_stats.match_id")
      .select([
        "match_player_stats.id",
        "match_player_stats.group_id",
        "match_player_stats.match_id",
        "match_player_stats.user_id",
        "match_player_stats.goals",
        "match_player_stats.third_time_attended",
        "match_player_stats.third_time_beers",
        "match_player_stats.confirmed",
        "match_player_stats.created_at",
        "match_player_stats.updated_at",
        "matches.id as match_id",
        "matches.group_id as match_group_id",
        "matches.date as match_date",
        "matches.time as match_time",
        "matches.location_id as match_location_id",
        "matches.court_id as match_court_id",
        "matches.status as match_status",
        "matches.max_players as match_max_players",
        "matches.max_substitutes as match_max_substitutes",
        "matches.cost_per_player as match_cost_per_player",
        "matches.same_day_cost as match_same_day_cost",
        "matches.created_by_user_id as match_created_by_user_id",
        "matches.voting_closed_at as match_voting_closed_at",
        "matches.created_at as match_created_at",
        "matches.updated_at as match_updated_at",
      ])
      .where("match_player_stats.user_id", "=", userId)
      .orderBy("matches.date", "desc")
      .execute();

    return rows.map((row: any) => ({
      ...dbStatsToMatchPlayerStats(row),
      match: {
        id: row.match_id,
        groupId: row.match_group_id,
        date: row.match_date,
        time: row.match_time,
        locationId: row.match_location_id,
        courtId: row.match_court_id || undefined,
        status: row.match_status,
        maxPlayers: row.match_max_players,
        maxSubstitutes: row.match_max_substitutes || 0,
        costPerPlayer: row.match_cost_per_player,
        sameDayCost: row.match_same_day_cost,
        createdByUserId: row.match_created_by_user_id,
        votingClosedAt: row.match_voting_closed_at ?? null,
        createdAt: new Date(row.match_created_at),
        updatedAt: new Date(row.match_updated_at),
      },
    }));
  }

  async upsert(data: CreateMatchPlayerStatsData): Promise<MatchPlayerStats> {
    const existing = await this.findByMatchAndUser(data.matchId, data.userId);

    if (existing) {
      return this.update(existing.id, {
        goals: data.goals,
        thirdTimeAttended: data.thirdTimeAttended,
        thirdTimeBeers: data.thirdTimeBeers,
      });
    }

    const id = generateId();
    const now = new Date().toISOString();

    const newStats = {
      id,
      group_id: data.groupId,
      match_id: data.matchId,
      user_id: data.userId,
      goals: data.goals ?? 0,
      third_time_attended: data.thirdTimeAttended ? 1 : 0,
      third_time_beers: data.thirdTimeBeers ?? 0,
      confirmed: 0,
      created_at: now,
      updated_at: now,
    };

    await this.db.insertInto("match_player_stats").values(newStats).execute();

    return dbStatsToMatchPlayerStats(newStats);
  }

  async update(
    id: string,
    updates: UpdateMatchPlayerStatsData,
  ): Promise<MatchPlayerStats> {
    const now = new Date().toISOString();
    const updateData: Record<string, any> = { updated_at: now };

    if (updates.goals !== undefined) updateData.goals = updates.goals;
    if (updates.thirdTimeAttended !== undefined)
      updateData.third_time_attended = updates.thirdTimeAttended ? 1 : 0;
    if (updates.thirdTimeBeers !== undefined)
      updateData.third_time_beers = updates.thirdTimeBeers;
    if (updates.confirmed !== undefined)
      updateData.confirmed = updates.confirmed ? 1 : 0;

    await this.db
      .updateTable("match_player_stats")
      .set(updateData)
      .where("id", "=", id)
      .execute();

    const updated = await this.db
      .selectFrom("match_player_stats")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!updated) {
      throw new Error("Player stats not found after update");
    }

    return dbStatsToMatchPlayerStats(updated);
  }

  async delete(id: string): Promise<void> {
    await this.db
      .deleteFrom("match_player_stats")
      .where("id", "=", id)
      .execute();
  }

  async getPlayerAggregateStats(userId: string): Promise<{
    totalMatches: number;
    totalGoals: number;
    totalThirdTimeAttendances: number;
    totalBeers: number;
  }> {
    // Count distinct matches where user participated (non-cancelled signups)
    const matchCountResult = await this.db
      .selectFrom("signups")
      .select(sql`COUNT(DISTINCT match_id)`.as("total_matches"))
      .where("user_id", "=", userId)
      .where("status", "=", "PAID")
      .executeTakeFirst();

    // Sum stats from match_player_stats
    const statsResult = await this.db
      .selectFrom("match_player_stats")
      .select([
        sql`COALESCE(SUM(goals), 0)`.as("total_goals"),
        sql`COALESCE(SUM(third_time_attended), 0)`.as(
          "total_third_time_attendances",
        ),
        sql`COALESCE(SUM(third_time_beers), 0)`.as("total_beers"),
      ])
      .where("user_id", "=", userId)
      .executeTakeFirst();

    return {
      totalMatches: Number(matchCountResult?.total_matches || 0),
      totalGoals: Number(statsResult?.total_goals || 0),
      totalThirdTimeAttendances: Number(
        statsResult?.total_third_time_attendances || 0,
      ),
      totalBeers: Number(statsResult?.total_beers || 0),
    };
  }

  async getAllPlayerSummaries(): Promise<PlayerSummary[]> {
    // Get all users who have at least one non-cancelled signup
    const rows = await sql<{
      user_id: string;
      user_name: string;
      user_email: string;
      username: string | null;
      display_username: string | null;
      nationality: string | null;
      profile_picture: string | null;
      total_matches: number;
      total_goals: number;
      total_third_times: number;
    }>`
      SELECT
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.username,
        u.displayUsername as display_username,
        u.nationality,
        u.profilePicture as profile_picture,
        COUNT(DISTINCT s.match_id) as total_matches,
        COALESCE(SUM(mps.goals), 0) as total_goals,
        COALESCE(SUM(mps.third_time_attended), 0) as total_third_times
      FROM user u
      INNER JOIN signups s ON u.id = s.user_id AND s.status = 'PAID'
      LEFT JOIN match_player_stats mps ON u.id = mps.user_id
      GROUP BY u.id
      ORDER BY total_matches DESC, u.name ASC
    `.execute(this.db);

    return rows.rows.map((row) => {
      const userName = row.user_name || row.user_email;
      const rawNick = row.display_username || row.username || null;
      const userNickname =
        rawNick && !rawNick.includes("@") && rawNick !== userName
          ? rawNick
          : null;
      return {
        userId: row.user_id,
        userName,
        userNickname,
        userEmail: row.user_email,
        nationality: row.nationality || undefined,
        profilePicture: row.profile_picture || undefined,
        totalMatches: Number(row.total_matches),
        totalGoals: Number(row.total_goals),
        totalThirdTimes: Number(row.total_third_times),
      };
    });
  }

  async getUserById(userId: string): Promise<User | null> {
    const row = await this.db
      .selectFrom("user")
      .selectAll()
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!row) return null;

    return {
      id: row.id,
      name: row.name || row.email,
      email: row.email,
      image: row.image || undefined,
      role: (row.role as "user" | "admin") || "user",
      nationality: row.nationality || undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async getRankingsByMatches(
    groupId: string,
    limit: number,
  ): Promise<PlayerRanking[]> {
    const rows = await sql<{
      user_id: string;
      user_name: string;
      user_email: string;
      username: string | null;
      display_username: string | null;
      nationality: string | null;
      profile_picture: string | null;
      value: number;
      rank: number;
    }>`
      SELECT
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.username,
        u.displayUsername as display_username,
        u.nationality,
        u.profilePicture as profile_picture,
        COUNT(DISTINCT s.match_id) as value,
        ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT s.match_id) DESC, u.name ASC) as rank
      FROM user u
      INNER JOIN signups s ON u.id = s.user_id AND s.status = 'PAID' AND s.group_id = ${groupId}
      GROUP BY u.id
      ORDER BY rank ASC
      LIMIT ${limit}
    `.execute(this.db);

    return rows.rows.map((row) => {
      const userName = row.user_name || row.user_email;
      const rawNick = row.display_username || row.username || null;
      const userNickname =
        rawNick && !rawNick.includes("@") && rawNick !== userName
          ? rawNick
          : null;
      return {
        rank: Number(row.rank),
        userId: row.user_id,
        userName,
        userNickname,
        userEmail: row.user_email,
        nationality: row.nationality || undefined,
        profilePicture: row.profile_picture || undefined,
        value: Number(row.value),
      };
    });
  }

  async getRankingsByThirdTimes(
    groupId: string,
    limit: number,
  ): Promise<PlayerRanking[]> {
    const rows = await sql<{
      user_id: string;
      user_name: string;
      user_email: string;
      username: string | null;
      display_username: string | null;
      nationality: string | null;
      profile_picture: string | null;
      value: number;
      rank: number;
    }>`
      SELECT
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.username,
        u.displayUsername as display_username,
        u.nationality,
        u.profilePicture as profile_picture,
        COALESCE(SUM(mps.third_time_attended), 0) as value,
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(mps.third_time_attended), 0) DESC, u.name ASC) as rank
      FROM user u
      INNER JOIN signups s ON u.id = s.user_id AND s.status = 'PAID' AND s.group_id = ${groupId}
      LEFT JOIN match_player_stats mps ON u.id = mps.user_id AND mps.group_id = ${groupId}
      GROUP BY u.id
      HAVING value > 0
      ORDER BY rank ASC
      LIMIT ${limit}
    `.execute(this.db);

    return rows.rows.map((row) => {
      const userName = row.user_name || row.user_email;
      const rawNick = row.display_username || row.username || null;
      const userNickname =
        rawNick && !rawNick.includes("@") && rawNick !== userName
          ? rawNick
          : null;
      return {
        rank: Number(row.rank),
        userId: row.user_id,
        userName,
        userNickname,
        userEmail: row.user_email,
        nationality: row.nationality || undefined,
        profilePicture: row.profile_picture || undefined,
        value: Number(row.value),
      };
    });
  }

  async getRankingsByBeers(
    groupId: string,
    limit: number,
  ): Promise<PlayerRanking[]> {
    const rows = await sql<{
      user_id: string;
      user_name: string;
      user_email: string;
      username: string | null;
      display_username: string | null;
      nationality: string | null;
      profile_picture: string | null;
      value: number;
      rank: number;
    }>`
      SELECT
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.username,
        u.displayUsername as display_username,
        u.nationality,
        u.profilePicture as profile_picture,
        COALESCE(SUM(mps.third_time_beers), 0) as value,
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(mps.third_time_beers), 0) DESC, u.name ASC) as rank
      FROM user u
      INNER JOIN signups s ON u.id = s.user_id AND s.status = 'PAID' AND s.group_id = ${groupId}
      LEFT JOIN match_player_stats mps ON u.id = mps.user_id AND mps.group_id = ${groupId}
      GROUP BY u.id
      HAVING value > 0
      ORDER BY rank ASC
      LIMIT ${limit}
    `.execute(this.db);

    return rows.rows.map((row) => {
      const userName = row.user_name || row.user_email;
      const rawNick = row.display_username || row.username || null;
      const userNickname =
        rawNick && !rawNick.includes("@") && rawNick !== userName
          ? rawNick
          : null;
      return {
        rank: Number(row.rank),
        userId: row.user_id,
        userName,
        userNickname,
        userEmail: row.user_email,
        nationality: row.nationality || undefined,
        profilePicture: row.profile_picture || undefined,
        value: Number(row.value),
      };
    });
  }
}

// Turso Match Media Repository -------------------------------------------

export interface CreateMatchMediaInput {
  id: string;
  matchId: string;
  uploaderUserId: string;
  kind: MediaKind;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  r2Key: string;
}

export class TursoMatchMediaRepository {
  private db = getDatabase();

  async create(input: CreateMatchMediaInput): Promise<void> {
    await this.db
      .insertInto("match_media")
      .values({
        id: input.id,
        match_id: input.matchId,
        uploader_user_id: input.uploaderUserId,
        kind: input.kind,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        caption: input.caption,
        r2_key: input.r2Key,
      })
      .execute();
  }

  async findById(id: string): Promise<{
    id: string;
    matchId: string;
    uploaderUserId: string;
    kind: MediaKind;
    mimeType: string;
    sizeBytes: number;
    caption: string | null;
    r2Key: string;
    createdAt: Date;
  } | null> {
    const row = await this.db
      .selectFrom("match_media")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) return null;
    return {
      id: row.id,
      matchId: row.match_id,
      uploaderUserId: row.uploader_user_id,
      kind: row.kind,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      caption: row.caption,
      r2Key: row.r2_key,
      createdAt: new Date(row.created_at as unknown as string),
    };
  }

  async deleteById(id: string): Promise<void> {
    await this.db.deleteFrom("match_media").where("id", "=", id).execute();
  }

  async countByMatch(matchId: string): Promise<number> {
    const row = await this.db
      .selectFrom("match_media")
      .select((eb) => eb.fn.countAll<number>().as("c"))
      .where("match_id", "=", matchId)
      .executeTakeFirst();
    return Number(row?.c ?? 0);
  }

  /**
   * List all media for a match, including the uploader's name, aggregated reaction counts,
   * and whether the calling user reacted to each emoji.
   *
   * `callerUserId` may be null for anonymous calls (reactions will have `didReact: false`).
   */
  async listByMatch(
    matchId: string,
    callerUserId: string | null,
  ): Promise<
    Array<{
      id: string;
      matchId: string;
      uploaderUserId: string;
      uploaderName: string;
      kind: MediaKind;
      mimeType: string;
      sizeBytes: number;
      caption: string | null;
      r2Key: string;
      createdAt: Date;
      reactionCounts: Record<string, number>;
      ownReactions: Set<string>;
    }>
  > {
    const rows = await this.db
      .selectFrom("match_media as m")
      .innerJoin("user as u", "u.id", "m.uploader_user_id")
      .select([
        "m.id as id",
        "m.match_id as matchId",
        "m.uploader_user_id as uploaderUserId",
        "u.name as uploaderName",
        "m.kind as kind",
        "m.mime_type as mimeType",
        "m.size_bytes as sizeBytes",
        "m.caption as caption",
        "m.r2_key as r2Key",
        "m.created_at as createdAt",
      ])
      .where("m.match_id", "=", matchId)
      .orderBy("m.created_at", "desc")
      .execute();

    if (rows.length === 0) return [];

    const mediaIds = rows.map((r) => r.id);

    const reactionRows = await this.db
      .selectFrom("match_media_reaction")
      .select(["media_id", "user_id", "emoji"])
      .where("media_id", "in", mediaIds)
      .execute();

    const countsByMedia = new Map<string, Record<string, number>>();
    const ownByMedia = new Map<string, Set<string>>();
    for (const r of reactionRows) {
      const counts = countsByMedia.get(r.media_id) ?? {};
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
      countsByMedia.set(r.media_id, counts);

      if (callerUserId && r.user_id === callerUserId) {
        const set = ownByMedia.get(r.media_id) ?? new Set<string>();
        set.add(r.emoji);
        ownByMedia.set(r.media_id, set);
      }
    }

    return rows.map((r) => ({
      id: r.id,
      matchId: r.matchId,
      uploaderUserId: r.uploaderUserId,
      uploaderName: r.uploaderName ?? "",
      kind: r.kind as MediaKind,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      caption: r.caption,
      r2Key: r.r2Key,
      createdAt: new Date(r.createdAt as unknown as string),
      reactionCounts: countsByMedia.get(r.id) ?? {},
      ownReactions: ownByMedia.get(r.id) ?? new Set<string>(),
    }));
  }

  /**
   * Hydrate a set of media IDs with uploader name + aggregated reactions.
   * Returns rows in the same shape as `listByMatch`, but filtered to the
   * explicit ID list. Preserves natural ordering of rows from the DB; callers
   * should re-sort if a specific order is needed.
   */
  async listByIds(
    mediaIds: string[],
    callerUserId: string | null,
  ): Promise<
    Array<{
      id: string;
      matchId: string;
      uploaderUserId: string;
      uploaderName: string;
      kind: MediaKind;
      mimeType: string;
      sizeBytes: number;
      caption: string | null;
      r2Key: string;
      createdAt: Date;
      reactionCounts: Record<string, number>;
      ownReactions: Set<string>;
    }>
  > {
    if (mediaIds.length === 0) return [];

    const rows = await this.db
      .selectFrom("match_media as m")
      .innerJoin("user as u", "u.id", "m.uploader_user_id")
      .select([
        "m.id as id",
        "m.match_id as matchId",
        "m.uploader_user_id as uploaderUserId",
        "u.name as uploaderName",
        "m.kind as kind",
        "m.mime_type as mimeType",
        "m.size_bytes as sizeBytes",
        "m.caption as caption",
        "m.r2_key as r2Key",
        "m.created_at as createdAt",
      ])
      .where("m.id", "in", mediaIds)
      .execute();

    if (rows.length === 0) return [];

    const reactionRows = await this.db
      .selectFrom("match_media_reaction")
      .select(["media_id", "user_id", "emoji"])
      .where("media_id", "in", mediaIds)
      .execute();

    const countsByMedia = new Map<string, Record<string, number>>();
    const ownByMedia = new Map<string, Set<string>>();
    for (const r of reactionRows) {
      const counts = countsByMedia.get(r.media_id) ?? {};
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
      countsByMedia.set(r.media_id, counts);

      if (callerUserId && r.user_id === callerUserId) {
        const set = ownByMedia.get(r.media_id) ?? new Set<string>();
        set.add(r.emoji);
        ownByMedia.set(r.media_id, set);
      }
    }

    return rows.map((r) => ({
      id: r.id,
      matchId: r.matchId,
      uploaderUserId: r.uploaderUserId,
      uploaderName: r.uploaderName ?? "",
      kind: r.kind as MediaKind,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      caption: r.caption,
      r2Key: r.r2Key,
      createdAt: new Date(r.createdAt as unknown as string),
      reactionCounts: countsByMedia.get(r.id) ?? {},
      ownReactions: ownByMedia.get(r.id) ?? new Set<string>(),
    }));
  }

  /**
   * Toggle a reaction. Inserts if not present, deletes if present.
   * Returns the final state: true = now reacted, false = reaction removed.
   */
  async toggleReaction(
    mediaId: string,
    userId: string,
    emoji: ReactionEmoji,
  ): Promise<{ didReact: boolean; newCount: number }> {
    // Race-safe toggle: try INSERT OR IGNORE first. If the insert reports 0
    // changes, the row already existed, so we DELETE it instead. This avoids
    // read-then-write unique-constraint violations under concurrent requests.
    const insertResult = await this.db
      .insertInto("match_media_reaction")
      .values({ media_id: mediaId, user_id: userId, emoji })
      .onConflict((oc) => oc.doNothing())
      .executeTakeFirst();

    const didInsert = Number(insertResult.numInsertedOrUpdatedRows ?? 0) > 0;

    if (!didInsert) {
      await this.db
        .deleteFrom("match_media_reaction")
        .where("media_id", "=", mediaId)
        .where("user_id", "=", userId)
        .where("emoji", "=", emoji)
        .execute();
    }

    const countRow = await this.db
      .selectFrom("match_media_reaction")
      .select((eb) => eb.fn.countAll<number>().as("c"))
      .where("media_id", "=", mediaId)
      .where("emoji", "=", emoji)
      .executeTakeFirst();

    return {
      didReact: didInsert,
      newCount: Number(countRow?.c ?? 0),
    };
  }

  /**
   * Returns a page of matches (ordered by most-recent-upload per match), with up to
   * `itemsPerMatch` media items each. Cursor is the `createdAt` of the last match's
   * latest item (ISO string). Empty cursor = first page. Scoped to `groupId` — the
   * match row is the scoping anchor since match_media itself has no group column.
   */
  async feed(options: {
    groupId: string;
    cursor: string | null;
    matchesPerPage: number;
    itemsPerMatch: number;
  }): Promise<{
    groups: Array<{
      matchId: string;
      matchDate: string;
      fieldName: string | null;
      lastUploadAt: string;
      totalCount: number;
      mediaIds: string[];
    }>;
    nextCursor: string | null;
  }> {
    const { groupId, cursor, matchesPerPage, itemsPerMatch } = options;

    // Step 1: Get distinct matches ordered by their most recent upload, after cursor.
    let matchQuery = this.db
      .selectFrom("match_media as m")
      .innerJoin("matches as mt", "mt.id", "m.match_id")
      .leftJoin("locations as l", "l.id", "mt.location_id")
      .select((eb) => [
        sql<string>`m.match_id`.as("matchId"),
        sql<string>`mt.date`.as("matchDate"),
        sql<string | null>`l.name`.as("fieldName"),
        eb.fn.max<string>("m.created_at").as("lastUploadAt"),
        eb.fn.countAll<number>().as("totalCount"),
      ])
      .where("mt.group_id", "=", groupId)
      .groupBy((eb) => [sql`m.match_id`, sql`mt.date`, sql`l.name`])
      .orderBy("lastUploadAt", "desc")
      .limit(matchesPerPage + 1); // fetch one extra to detect next page

    if (cursor) {
      matchQuery = matchQuery.having(sql`MAX(m.created_at)`, "<", cursor);
    }

    const matchRows = await matchQuery.execute();

    const hasMore = matchRows.length > matchesPerPage;
    const pageMatches = hasMore
      ? matchRows.slice(0, matchesPerPage)
      : matchRows;
    const nextCursor =
      hasMore && pageMatches.length > 0
        ? ((pageMatches[pageMatches.length - 1]
            ?.lastUploadAt as unknown as string) ?? null)
        : null;

    if (pageMatches.length === 0) {
      return { groups: [], nextCursor: null };
    }

    // Step 2: For each match in this page, fetch the latest `itemsPerMatch` media ids.
    const matchIds = pageMatches.map((r) => r.matchId);
    const itemRows = await this.db
      .selectFrom("match_media")
      .select(["id", "match_id", "created_at"])
      .where("match_id", "in", matchIds)
      .orderBy("match_id", "asc")
      .orderBy("created_at", "desc")
      .execute();

    const idsByMatch = new Map<string, string[]>();
    for (const row of itemRows) {
      const list = idsByMatch.get(row.match_id) ?? [];
      if (list.length < itemsPerMatch) list.push(row.id);
      idsByMatch.set(row.match_id, list);
    }

    const groups = pageMatches.map((r) => ({
      matchId: r.matchId,
      matchDate: r.matchDate as unknown as string,
      fieldName: r.fieldName,
      lastUploadAt: r.lastUploadAt as unknown as string,
      totalCount: Number(r.totalCount),
      mediaIds: idsByMatch.get(r.matchId) ?? [],
    }));

    return { groups, nextCursor };
  }
}
