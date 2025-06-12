import { headers } from "next/headers";

import type { MatchMetadata } from "@/lib/google-sheets";

import { auth } from "@/lib/auth";
import {
  createMatchSheet,
  getAllMatchesMetadata,
  addMatchMetadata,
} from "@/lib/google-sheets";

// GET /api/matches: Returns all matches from the master sheet
export async function GET() {
  const matches = await getAllMatchesMetadata();
  return Response.json({ matches });
}

// POST /api/matches: Add a new match (sheet + metadata, organizer only)
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user || user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await req.json();
  const { date, time, courtNumber, costCourt, costShirts, status } = body;
  if (!date || !time) {
    return new Response("Missing required fields", { status: 400 });
  }
  // Generate a unique matchId and sheetName
  const matchId = Date.now().toString();
  const sheetName = `${date} ${time}`;
  // 1. Create the match sheet/tab and get its sheetId (gid)
  const sheetProps = await createMatchSheet(sheetName);
  const sheetGid = sheetProps.sheetId?.toString() || "";
  // 2. Add metadata row
  const meta: MatchMetadata = {
    matchId,
    sheetName,
    sheetGid,
    date,
    time,
    courtNumber,
    status: status || "upcoming",
    costCourt: costCourt || "",
    costShirts: costShirts || "",
  };
  await addMatchMetadata(meta);
  return Response.json({ match: meta });
}
