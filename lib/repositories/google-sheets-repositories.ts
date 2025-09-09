// Google Sheets implementation of repository interfaces
// This wraps existing Google Sheets functionality in the new repository pattern

import {
  getAllMatchesMetadata,
  getMatchMetadataById,
  addMatchMetadata,
  updateMatchMetadata,
  deleteMatchMetadata,
  createMatchSheet,
  getMatchSheetData,
  addOrUpdatePlayerRow,
  getSheetNameById,
} from "@/lib/google-sheets";
import { parse, isSameDay } from "date-fns";

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
  MatchMetadata,
  PlayerStatus,
} from "@/lib/domain/types";

// Google Sheets Location Repository (minimal implementation)
export class GoogleSheetsLocationRepository implements LocationRepository {
  private defaultLocation: Location = {
    id: "default",
    name: "Default Court",
    address: "",
    coordinates: "",
    courtCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  async findAll(): Promise<Location[]> {
    return [this.defaultLocation];
  }

  async findById(id: string): Promise<Location | null> {
    return id === "default" ? this.defaultLocation : null;
  }

  async create(location: CreateLocationData): Promise<Location> {
    throw new Error(
      "Creating locations not supported in Google Sheets implementation",
    );
  }

  async update(id: string, updates: UpdateLocationData): Promise<Location> {
    throw new Error(
      "Updating locations not supported in Google Sheets implementation",
    );
  }

  async delete(id: string): Promise<void> {
    throw new Error(
      "Deleting locations not supported in Google Sheets implementation",
    );
  }
}

// Google Sheets Match Repository
export class GoogleSheetsMatchRepository implements MatchRepository {
  async findAll(filters?: MatchFilters): Promise<Match[]> {
    const metadata = await getAllMatchesMetadata();
    let matches = metadata.map(this.metadataToMatch);

    if (filters?.type) {
      const today = new Date();
      matches = matches.filter((match) => {
        if (!match.date) return false;
        const matchDate = parse(match.date, "yyyy-MM-dd", new Date());

        if (filters.type === "past") {
          return matchDate < new Date(today.setHours(0, 0, 0, 0));
        } else if (filters.type === "upcoming") {
          return matchDate >= new Date(today.setHours(0, 0, 0, 0));
        }
        return true;
      });
    }

    if (filters?.status) {
      matches = matches.filter((match) => match.status === filters.status);
    }

    return matches;
  }

  async findById(id: string): Promise<Match | null> {
    const metadata = await getMatchMetadataById(id);
    return metadata ? this.metadataToMatch(metadata) : null;
  }

  async findByIdWithDetails(
    id: string,
    userId?: string,
  ): Promise<MatchDetails | null> {
    const metadata = await getMatchMetadataById(id);
    if (!metadata) return null;

    const match = this.metadataToMatch(metadata);
    const sheetName = await getSheetNameById(id);

    let signups: Signup[] = [];
    if (sheetName) {
      const data = await getMatchSheetData(sheetName);
      if (data && data.length > 0) {
        const header = data[0];
        signups = data.slice(1).map((row) => this.rowToSignup(row, header, id));
      }
    }

    const location = await new GoogleSheetsLocationRepository().findById(
      "default",
    );

    return {
      ...match,
      location: location!,
      signups,
      createdByUser: {
        id: "unknown",
        name: "Admin",
        email: "",
        role: "admin" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      availableSpots: Math.max(0, match.maxPlayers - signups.length),
      isUserSignedUp: userId
        ? signups.some((s) => s.userId === userId)
        : undefined,
      userSignup: userId ? signups.find((s) => s.userId === userId) : undefined,
    };
  }

  async create(matchData: CreateMatchData): Promise<Match> {
    // Check for duplicate dates
    const exists = await this.existsOnDate(matchData.date);
    if (exists) {
      throw new Error("Match already exists on this date");
    }

    // Generate sheet name and create the match sheet/tab
    const sheetName = `${matchData.date} ${matchData.time}`;
    const sheetProps = await createMatchSheet(sheetName);
    const sheetGid = sheetProps.sheetId?.toString() || "";
    const matchId = sheetGid;

    const metadata: MatchMetadata = {
      matchId,
      sheetName,
      sheetGid,
      date: matchData.date,
      time: matchData.time,
      courtNumber: "1", // Default court number
      status: "upcoming",
      costCourt: matchData.costPerPlayer || "",
      costShirts: matchData.shirtCost || "",
    };

    await addMatchMetadata(metadata);
    return this.metadataToMatch(metadata);
  }

  async update(id: string, updates: UpdateMatchData): Promise<Match> {
    await updateMatchMetadata(id, {
      date: updates.date,
      time: updates.time,
      costCourt: updates.costPerPlayer,
      costShirts: updates.shirtCost,
      status: updates.status,
    });

    const updatedMetadata = await getMatchMetadataById(id);
    if (!updatedMetadata) {
      throw new Error("Match not found after update");
    }

    return this.metadataToMatch(updatedMetadata);
  }

  async delete(id: string): Promise<void> {
    await deleteMatchMetadata(id);
  }

  async existsOnDate(date: string): Promise<boolean> {
    const allMatches = await getAllMatchesMetadata();
    const newDate = parse(date, "yyyy-MM-dd", new Date());

    return allMatches.some((m) => {
      if (!m.date) return false;
      const matchDate = parse(m.date, "yyyy-MM-dd", new Date());
      return isSameDay(newDate, matchDate);
    });
  }

  private metadataToMatch(metadata: MatchMetadata): Match {
    return {
      id: metadata.matchId,
      locationId: "default",
      date: metadata.date,
      time: metadata.time,
      status:
        metadata.status === "upcoming"
          ? "upcoming"
          : metadata.status === "cancelled"
            ? "cancelled"
            : metadata.status === "completed"
              ? "completed"
              : "upcoming",
      maxPlayers: 10, // Default max players
      costPerPlayer: metadata.costCourt,
      shirtCost: metadata.costShirts,
      createdByUserId: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private rowToSignup(
    row: string[],
    header: string[],
    matchId: string,
  ): Signup {
    const getValue = (columnName: string) => {
      const index = header.indexOf(columnName);
      return index >= 0 ? row[index] || "" : "";
    };

    const isGuest = getValue("IsGuest") === "1";
    const guestOwnerId = getValue("OwnerEmail");

    return {
      id: `${matchId}-${getValue("Email")}-${Date.now()}`, // Generate ID
      matchId,
      userId: isGuest ? undefined : getValue("Email"), // Use email as user ID for now
      playerName: getValue("Name"),
      playerEmail: getValue("Email"),
      status: this.mapStatus(getValue("Status")),
      signupType: isGuest ? "guest" : "self",
      guestOwnerId: isGuest && guestOwnerId ? guestOwnerId : undefined,
      addedByUserId: isGuest && guestOwnerId ? guestOwnerId : getValue("Email"),
      signedUpAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private mapStatus(status: string): PlayerStatus {
    switch (status.toUpperCase()) {
      case "PAID":
        return "PAID";
      case "PENDING":
        return "PENDING";
      case "CANCELLED":
        return "CANCELLED";
      default:
        return "PENDING";
    }
  }
}

// Google Sheets Signup Repository
export class GoogleSheetsSignupRepository implements SignupRepository {
  async findAll(filters?: SignupFilters): Promise<Signup[]> {
    if (!filters?.matchId) {
      throw new Error(
        "findAll requires matchId filter for Google Sheets implementation",
      );
    }
    return this.findByMatchId(filters.matchId);
  }

  async findByMatchId(matchId: string): Promise<Signup[]> {
    const sheetName = await getSheetNameById(matchId);
    if (!sheetName) return [];

    const data = await getMatchSheetData(sheetName);
    if (!data || data.length === 0) return [];

    const header = data[0];
    return data.slice(1).map((row) => this.rowToSignup(row, header, matchId));
  }

  async findByUserId(userId: string): Promise<Signup[]> {
    // This would require iterating through all matches, not efficient
    throw new Error(
      "findByUserId not efficiently supported in Google Sheets implementation",
    );
  }

  async findById(id: string): Promise<Signup | null> {
    // Parse ID to get match and email info
    const parts = id.split("-");
    if (parts.length < 3) return null;

    const matchId = parts[0];
    const email = parts[1];

    const signups = await this.findByMatchId(matchId);
    return signups.find((s) => s.playerEmail === email) || null;
  }

  async findByIdWithDetails(id: string): Promise<SignupWithDetails | null> {
    const signup = await this.findById(id);
    if (!signup) return null;

    const matchRepo = new GoogleSheetsMatchRepository();
    const match = await matchRepo.findById(signup.matchId);

    if (!match) return null;

    return {
      ...signup,
      match,
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
    const signups = await this.findByMatchId(matchId);
    return signups.some((s) => s.userId === userId);
  }

  async getSignupCount(matchId: string): Promise<number> {
    const signups = await this.findByMatchId(matchId);
    return signups.length;
  }

  async create(signupData: CreateSignupData): Promise<Signup> {
    const sheetName = await getSheetNameById(signupData.matchId);
    if (!sheetName) {
      throw new Error("Match not found");
    }

    await addOrUpdatePlayerRow(sheetName, {
      name: signupData.playerName,
      email: signupData.playerEmail,
      status: signupData.status || "PENDING",
      isGuest: signupData.signupType === "guest",
      ownerEmail: signupData.guestOwnerId,
    });

    // Return the created signup
    return {
      id: `${signupData.matchId}-${signupData.playerEmail}-${Date.now()}`,
      matchId: signupData.matchId,
      userId: signupData.userId,
      playerName: signupData.playerName,
      playerEmail: signupData.playerEmail,
      status: signupData.status || "PENDING",
      signupType: signupData.signupType,
      guestOwnerId: signupData.guestOwnerId,
      addedByUserId: signupData.addedByUserId,
      signedUpAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async update(id: string, updates: UpdateSignupData): Promise<Signup> {
    const signup = await this.findById(id);
    if (!signup) {
      throw new Error("Signup not found");
    }

    const sheetName = await getSheetNameById(signup.matchId);
    if (!sheetName) {
      throw new Error("Match not found");
    }

    await addOrUpdatePlayerRow(sheetName, {
      name: updates.playerName || signup.playerName,
      email: signup.playerEmail,
      status: updates.status || signup.status,
      isGuest: signup.signupType === "guest",
      ownerEmail: signup.guestOwnerId,
    });

    return {
      ...signup,
      ...updates,
      updatedAt: new Date(),
    };
  }

  async delete(id: string): Promise<void> {
    throw new Error(
      "Delete signup not supported in Google Sheets implementation",
    );
  }

  async addGuest(guestData: CreateGuestSignupData): Promise<Signup> {
    const sheetName = await getSheetNameById(guestData.matchId);
    if (!sheetName) {
      throw new Error("Match not found");
    }

    // Compose guest display name
    const name = guestData.guestName
      ? `${guestData.guestName} (Guest of ${guestData.ownerName})`
      : `Guest of ${guestData.ownerName}`;

    // Generate unique guest email
    const playerEmail = `guest-${Math.random().toString(36).slice(2, 10)}`;

    await addOrUpdatePlayerRow(sheetName, {
      name,
      email: playerEmail,
      status: guestData.status || "PENDING",
      isGuest: true,
      ownerEmail: guestData.ownerEmail,
      guestName: guestData.guestName,
      ownerName: guestData.ownerName,
    });

    return {
      id: `${guestData.matchId}-${playerEmail}-${Date.now()}`,
      matchId: guestData.matchId,
      userId: undefined,
      playerName: name,
      playerEmail,
      status: guestData.status || "PENDING",
      signupType: "guest",
      guestOwnerId: guestData.ownerUserId,
      addedByUserId: guestData.ownerUserId,
      signedUpAt: new Date(),
      updatedAt: new Date(),
    };
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
    throw new Error(
      "Remove player by admin not supported in Google Sheets implementation",
    );
  }

  async findAddedByUser(userId: string): Promise<Signup[]> {
    throw new Error(
      "findAddedByUser not efficiently supported in Google Sheets implementation",
    );
  }

  private rowToSignup(
    row: string[],
    header: string[],
    matchId: string,
  ): Signup {
    const getValue = (columnName: string) => {
      const index = header.indexOf(columnName);
      return index >= 0 ? row[index] || "" : "";
    };

    const isGuest = getValue("IsGuest") === "1";
    const guestOwnerId = getValue("OwnerEmail");

    return {
      id: `${matchId}-${getValue("Email")}-${Date.now()}`,
      matchId,
      userId: isGuest ? undefined : getValue("Email"),
      playerName: getValue("Name"),
      playerEmail: getValue("Email"),
      status: this.mapStatus(getValue("Status")),
      signupType: isGuest ? "guest" : "self",
      guestOwnerId: isGuest && guestOwnerId ? guestOwnerId : undefined,
      addedByUserId: isGuest && guestOwnerId ? guestOwnerId : getValue("Email"),
      signedUpAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private mapStatus(status: string): PlayerStatus {
    switch (status.toUpperCase()) {
      case "PAID":
        return "PAID";
      case "PENDING":
        return "PENDING";
      case "CANCELLED":
        return "CANCELLED";
      default:
        return "PENDING";
    }
  }
}

// Google Sheets Match Invitation Repository (not implemented)
export class GoogleSheetsMatchInvitationRepository
  implements MatchInvitationRepository
{
  async findByMatchId(matchId: string): Promise<MatchInvitation[]> {
    return []; // Not supported in Google Sheets
  }

  async findByInviterId(userId: string): Promise<MatchInvitation[]> {
    return []; // Not supported in Google Sheets
  }

  async findByEmail(email: string): Promise<MatchInvitation[]> {
    return []; // Not supported in Google Sheets
  }

  async create(invitation: CreateInvitationData): Promise<MatchInvitation> {
    throw new Error(
      "Invitations not supported in Google Sheets implementation",
    );
  }

  async updateStatus(
    id: string,
    status: "accepted" | "declined",
  ): Promise<MatchInvitation> {
    throw new Error(
      "Invitations not supported in Google Sheets implementation",
    );
  }

  async delete(id: string): Promise<void> {
    throw new Error(
      "Invitations not supported in Google Sheets implementation",
    );
  }

  async deleteExpired(olderThanDays: number): Promise<number> {
    return 0; // Not supported in Google Sheets
  }
}
