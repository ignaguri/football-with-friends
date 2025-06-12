import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { createMatchSheet } from "@/lib/google-sheets";
import { getMatchesFromSheets } from "@/lib/matches";

// GET /api/matches: Returns list of future match sheets, sorted by date (next first)
export async function GET() {
  return Response.json(await getMatchesFromSheets());
}

// POST /api/matches: Add a new match sheet (organizer only)
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user || user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }
  const { name } = await req.json();
  if (!name) {
    return new Response("Missing match name", { status: 400 });
  }
  const sheetProps = await createMatchSheet(name);
  return Response.json({ match: sheetProps });
}
