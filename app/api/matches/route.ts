import { auth } from "@/lib/auth";
import { matchToDisplay } from "@/lib/mappers/display-mappers";
import { getServiceFactory } from "@/lib/services/factory";
import { headers } from "next/headers";
import { z } from "zod";

import type { MatchFilters, CreateMatchData, User } from "@/lib/domain/types";
import type { MatchDisplay } from "@/lib/mappers/display-mappers";

// GET /api/matches: Returns all matches
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as "past" | "upcoming" | null;

    const filters: MatchFilters = {};
    if (type) {
      filters.type = type;
    }

    const { matchService } = getServiceFactory();
    const matches = await matchService.getAllMatches(filters);

    // Convert domain objects to display format
    const matchDisplays: MatchDisplay[] = matches.map(matchToDisplay);

    return Response.json({ matches: matchDisplays });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return Response.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}

const matchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  time: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm
  locationId: z.string().optional(),
  maxPlayers: z.number().min(2).optional(),
  costPerPlayer: z.string().optional(),
  shirtCost: z.string().optional(),
});

// POST /api/matches: Add a new match (admin only)
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as User | undefined;

    if (!user || user.role !== "admin") {
      return Response.json(
        { error: "errors.unauthorizedApi" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parsed = matchSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "errors.invalidInput", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { date, time, locationId, maxPlayers, costPerPlayer, shirtCost } =
      parsed.data;

    const matchData: CreateMatchData = {
      date,
      time,
      locationId: locationId || "default",
      maxPlayers: maxPlayers || 10,
      costPerPlayer,
      shirtCost,
      createdByUserId: user.id,
    };

    const { matchService } = getServiceFactory();
    const match = await matchService.createMatch(matchData, user);

    return Response.json({ match });
  } catch (error) {
    console.error("Error creating match:", error);

    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return Response.json(
          { error: "errors.duplicateDate" },
          { status: 409 },
        );
      }
      if (error.message.includes("administrators")) {
        return Response.json(
          { error: "errors.unauthorizedApi" },
          { status: 401 },
        );
      }
      if (
        error.message.includes("required") ||
        error.message.includes("Invalid")
      ) {
        return Response.json({ error: "errors.invalidInput" }, { status: 400 });
      }
    }

    return Response.json({ error: "errors.unknownError" }, { status: 500 });
  }
}
