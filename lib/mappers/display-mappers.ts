// Display mappers for frontend-specific data transformation
// These functions convert domain objects to display-friendly formats

import type { Match, MatchDetails, Signup, Location } from "@/lib/domain/types";

// Display types for frontend components
export interface MatchDisplay {
  matchId: string;
  name: string;
  date: string;
  time: string;
  status: string;
  courtNumber: string;
  costCourt: string;
  costShirts: string;
  maxPlayers: number;
  availableSpots: number;
}

export interface MatchDetailsDisplay {
  header: string[];
  players: PlayerDisplay[];
  meta: MatchMetaDisplay;
  matchDetails: MatchDetails; // Include full details for enhanced functionality
}

export interface PlayerDisplay {
  Name: string;
  Email: string;
  Status: string;
  IsGuest: string;
  OwnerEmail: string;
  GuestName: string;
}

export interface MatchMetaDisplay {
  matchId: string;
  sheetName: string;
  sheetGid: string;
  date: string;
  time: string;
  courtNumber: string;
  status: string;
  costCourt: string;
  costShirts: string;
}

export interface PlayerStats {
  totalPlayers: number;
  paidPlayers: number;
  pendingPlayers: number;
  guestPlayers: number;
  availableSpots: number;
}

// Mapper functions

/**
 * Convert domain Match to display format for match lists
 */
export function matchToDisplay(match: Match): MatchDisplay {
  return {
    matchId: match.id,
    name: `${match.date} ${match.time}`, // Generate display name
    date: match.date,
    time: match.time,
    status: match.status,
    courtNumber: match.location?.name || "1",
    costCourt: match.costPerPlayer || "",
    costShirts: match.shirtCost || "",
    maxPlayers: match.maxPlayers,
    availableSpots: match.maxPlayers - (match.signups?.length || 0),
  };
}

/**
 * Convert domain MatchDetails to display format for match detail pages
 */
export function matchDetailsToDisplay(
  matchDetails: MatchDetails,
): MatchDetailsDisplay {
  const header = [
    "Name",
    "Email",
    "Status",
    "IsGuest",
    "OwnerEmail",
    "GuestName",
  ];

  const players: PlayerDisplay[] = matchDetails.signups.map((signup) => ({
    Name: signup.playerName,
    Email: signup.playerEmail,
    Status: signup.status,
    IsGuest: signup.signupType === "guest" ? "1" : "0",
    OwnerEmail: signup.guestOwnerId || "",
    GuestName: signup.signupType === "guest" ? signup.playerName : "",
  }));

  const meta: MatchMetaDisplay = {
    matchId: matchDetails.id,
    sheetName: `${matchDetails.date} ${matchDetails.time}`,
    sheetGid: matchDetails.id,
    date: matchDetails.date,
    time: matchDetails.time,
    courtNumber: matchDetails.location?.name || "1",
    status: matchDetails.status,
    costCourt: matchDetails.costPerPlayer || "",
    costShirts: matchDetails.shirtCost || "",
  };

  return {
    header,
    players,
    meta,
    matchDetails,
  };
}

/**
 * Calculate player statistics from signups
 */
export function calculatePlayerStats(
  signups: Signup[],
  maxPlayers: number,
): PlayerStats {
  const totalPlayers = signups.length;
  const paidPlayers = signups.filter((s) => s.status === "PAID").length;
  const pendingPlayers = signups.filter((s) => s.status === "PENDING").length;
  const guestPlayers = signups.filter((s) => s.signupType === "guest").length;
  const availableSpots = Math.max(0, maxPlayers - totalPlayers);

  return {
    totalPlayers,
    paidPlayers,
    pendingPlayers,
    guestPlayers,
    availableSpots,
  };
}

/**
 * Convert location to display format
 */
export function locationToDisplay(location: Location): {
  id: string;
  name: string;
  address?: string;
} {
  return {
    id: location.id,
    name: location.name,
    address: location.address,
  };
}

/**
 * Convert signup to display format for player tables
 */
export function signupToPlayerDisplay(signup: Signup): PlayerDisplay {
  return {
    Name: signup.playerName,
    Email: signup.playerEmail,
    Status: signup.status,
    IsGuest: signup.signupType === "guest" ? "1" : "0",
    OwnerEmail: signup.guestOwnerId || "",
    GuestName: signup.signupType === "guest" ? signup.playerName : "",
  };
}

/**
 * Helper to format match title for display
 */
export function formatMatchTitle(
  date: string,
  time: string,
  locale?: string,
): string {
  try {
    const matchDate = new Date(date);
    const timeStr = time;

    if (locale === "es") {
      return (
        matchDate.toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }) + ` a las ${timeStr}`
      );
    }

    return (
      matchDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }) + ` at ${timeStr}`
    );
  } catch {
    return `${date} ${time}`;
  }
}
