import { auth } from "@/lib/auth";
import { matchDetailsToDisplay } from "@/lib/mappers/display-mappers";
import { getServiceFactory } from "@/lib/services/factory";
import { headers } from "next/headers";

import type { UpdateMatchData, User } from "@/lib/domain/types";
import type { MatchDetailsDisplay } from "@/lib/mappers/display-mappers";

export async function GET(
  _req: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  try {
    const { matchId } = await context.params;

    // Get user from session for personalized data
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as User | undefined;

    const { matchService } = getServiceFactory();
    const matchDetails = await matchService.getMatchDetails(matchId, user?.id);

    if (!matchDetails) {
      return new Response("Not found", { status: 404 });
    }

    // Convert to display format using mapper
    const displayData: MatchDetailsDisplay =
      matchDetailsToDisplay(matchDetails);

    return Response.json(displayData);
  } catch (error) {
    console.error("Error fetching match data:", error);
    return new Response("Not found", { status: 404 });
  }
}

// PATCH: Update match metadata (admin only)
export async function PATCH(
  req: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as User | undefined;

    if (!user || user.role !== "admin") {
      return new Response("Unauthorized", { status: 401 });
    }

    const { matchId } = await context.params;
    const updates: UpdateMatchData = await req.json();

    const { matchService } = getServiceFactory();
    const updatedMatch = await matchService.updateMatch(matchId, updates, user);

    return Response.json({ match: updatedMatch });
  } catch (error) {
    console.error("Error updating match:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return new Response("Match not found", { status: 404 });
      }
      if (error.message.includes("administrators")) {
        return new Response("Unauthorized", { status: 401 });
      }
      if (error.message.includes("already exists")) {
        return new Response("Duplicate date", { status: 409 });
      }
    }

    return new Response("Internal server error", { status: 500 });
  }
}

// DELETE: Remove match (admin only)
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user as User | undefined;

    if (!user || user.role !== "admin") {
      return new Response("Unauthorized", { status: 401 });
    }

    const { matchId } = await context.params;

    const { matchService } = getServiceFactory();
    await matchService.deleteMatch(matchId, user);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error deleting match:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return new Response("Match not found", { status: 404 });
      }
      if (error.message.includes("administrators")) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    return new Response("Internal server error", { status: 500 });
  }
}
