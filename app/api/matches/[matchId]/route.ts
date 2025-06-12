import { headers } from "next/headers";

import type { MatchMetadata } from "@/lib/google-sheets";

import { auth } from "@/lib/auth";
import { getMatchSheetData } from "@/lib/google-sheets";
import { updateMatchMetadata, deleteMatchMetadata } from "@/lib/google-sheets";

export async function GET(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await context.params;
  const sheetName = decodeURIComponent(matchId);
  try {
    const data = await getMatchSheetData(sheetName);
    if (!data || data.length === 0) {
      return new Response("Not found", { status: 404 });
    }
    // Assume first row is header
    const header = data[0];
    const players = data.slice(1).map((row) => {
      const player: Record<string, string> = {};
      header.forEach((col, i) => {
        player[col] = row[i] || "";
      });
      return player;
    });
    return Response.json({ header, players });
  } catch (e) {
    console.error("Error fetching match data:", e);
    return new Response("Not found", { status: 404 });
  }
}

// PATCH: Update match metadata (admin only)
export async function PATCH(
  req: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user || user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }
  const { matchId } = await context.params;
  const updates: Partial<MatchMetadata> = await req.json();
  try {
    await updateMatchMetadata(matchId, updates);
    return new Response("OK", { status: 200 });
  } catch (e) {
    return new Response("Match not found", { status: 404 });
  }
}

// DELETE: Remove match metadata (admin only)
export async function DELETE(
  req: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user || user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }
  const { matchId } = await context.params;
  try {
    await deleteMatchMetadata(matchId);
    return new Response("OK", { status: 200 });
  } catch (e) {
    return new Response("Match not found", { status: 404 });
  }
}
