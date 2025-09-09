// Turso/LibSQL implementation of repository interfaces using Kysely

import { getDatabase } from "@/lib/database/connection";
import { sql } from "kysely";

import type {
  LocationRepository,
  MatchRepository,
  SignupRepository,
  MatchInvitationRepository,
} from "./interfaces";
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
  PlayerStatus,
} from "@/lib/domain/types";

// Helper function to generate IDs
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Helper function to convert database row to domain object
function dbLocationToLocation(row: any): Location {
  return {
    id: row.id,
    name: row.name,
    address: row.address || "",
    coordinates: row.coordinates || "",
    courtCount: row.court_count,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function dbMatchToMatch(row: any): Match {
  return {
    id: row.id,
    locationId: row.location_id,
    date: row.date,
    time: row.time,
    status: row.status,
    maxPlayers: row.max_players,
    costPerPlayer: row.cost_per_player,
    shirtCost: row.shirt_cost,
    createdByUserId: row.created_by_user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function dbSignupToSignup(row: any): Signup {
  return {
    id: row.id,
    matchId: row.match_id,
    userId: row.user_id,
    playerName: row.player_name,
    playerEmail: row.player_email,
    status: row.status as PlayerStatus,
    signupType: row.signup_type,
    guestOwnerId: row.guest_owner_id,
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

  async findAll(): Promise<Location[]> {
    const rows = await this.db
      .selectFrom("locations")
      .selectAll()
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

// Turso Match Repository
export class TursoMatchRepository implements MatchRepository {
  private db = getDatabase();

  async findAll(filters?: MatchFilters): Promise<Match[]> {
    let query = this.db
      .selectFrom("matches")
      .selectAll()
      .orderBy("date", "asc")
      .orderBy("time", "asc");

    if (filters?.status) {
      query = query.where("status", "=", filters.status);
    }

    if (filters?.type) {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      if (filters.type === "past") {
        query = query.where("date", "<", today);
      } else if (filters.type === "upcoming") {
        query = query.where("date", ">=", today);
      }
    }

    if (filters?.locationId) {
      query = query.where("location_id", "=", filters.locationId);
    }

    if (filters?.dateFrom) {
      query = query.where("date", ">=", filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.where("date", "<=", filters.dateTo);
    }

    const rows = await query.execute();
    return rows.map(dbMatchToMatch);
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

    // Get signups
    const signupRows = await this.db
      .selectFrom("signups")
      .selectAll()
      .where("match_id", "=", id)
      .orderBy("signed_up_at", "asc")
      .execute();

    const signups = signupRows.map(dbSignupToSignup);

    // Calculate available spots
    const availableSpots = Math.max(0, match.maxPlayers - signups.length);

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
      location_id: matchData.locationId,
      date: matchData.date,
      time: matchData.time,
      status: "upcoming" as const,
      max_players: matchData.maxPlayers || 10,
      cost_per_player: matchData.costPerPlayer || null,
      shirt_cost: matchData.shirtCost || null,
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
        ...(updates.date && { date: updates.date }),
        ...(updates.time && { time: updates.time }),
        ...(updates.status && { status: updates.status }),
        ...(updates.maxPlayers !== undefined && {
          max_players: updates.maxPlayers,
        }),
        ...(updates.costPerPlayer !== undefined && {
          cost_per_player: updates.costPerPlayer,
        }),
        ...(updates.shirtCost !== undefined && {
          shirt_cost: updates.shirtCost,
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

  async existsOnDate(date: string): Promise<boolean> {
    const result = await this.db
      .selectFrom("matches")
      .select(sql`1`.as("exists"))
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

  async create(signupData: CreateSignupData): Promise<Signup> {
    const id = generateId();
    const now = new Date().toISOString();

    const newSignup = {
      id,
      match_id: signupData.matchId,
      user_id: signupData.userId || null,
      player_name: signupData.playerName,
      player_email: signupData.playerEmail,
      status: signupData.status || "PENDING",
      signup_type: signupData.signupType,
      guest_owner_id: signupData.guestOwnerId || null,
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

    // Compose guest display name
    const name = guestData.guestName
      ? `${guestData.guestName} (Guest of ${guestData.ownerName})`
      : `Guest of ${guestData.ownerName}`;

    // Generate unique guest email
    const playerEmail = `guest-${generateId()}@local`;

    const newSignup = {
      id,
      match_id: guestData.matchId,
      user_id: null,
      player_name: name,
      player_email: playerEmail,
      status: guestData.status || "PENDING",
      signup_type: "guest" as const,
      guest_owner_id: guestData.ownerUserId,
      added_by_user_id: guestData.ownerUserId,
      signed_up_at: now,
      updated_at: now,
    };

    await this.db.insertInto("signups").values(newSignup).execute();

    return dbSignupToSignup(newSignup);
  }

  async addPlayerByAdmin(
    matchId: string,
    playerData: {
      userId?: string;
      playerName: string;
      playerEmail: string;
      status?: string;
    },
    adminId: string,
  ): Promise<Signup> {
    return this.create({
      matchId,
      userId: playerData.userId,
      playerName: playerData.playerName,
      playerEmail: playerData.playerEmail,
      status: (playerData.status as PlayerStatus) || "PENDING",
      signupType: "admin_added",
      addedByUserId: adminId,
    });
  }

  async removePlayerByAdmin(signupId: string, adminId: string): Promise<void> {
    // You might want to log this action for audit purposes
    console.log(`Admin ${adminId} removing signup ${signupId}`);
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
}

// Turso Match Invitation Repository
export class TursoMatchInvitationRepository
  implements MatchInvitationRepository
{
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
