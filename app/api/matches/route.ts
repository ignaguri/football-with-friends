import { parse, isSameDay } from "date-fns";
import { headers } from "next/headers";
import { z } from "zod";

import type { MatchMetadata } from "@/lib/google-sheets";

import { auth } from "@/lib/auth";
import {
  createMatchSheet,
  getAllMatchesMetadata,
  addMatchMetadata,
} from "@/lib/google-sheets";

// GET /api/matches: Returns all matches from the master sheet
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const matches = await getAllMatchesMetadata();
  const today = new Date();
  let filtered = matches;
  if (type === "past") {
    filtered = matches.filter((m) => {
      if (!m.date) return false;
      const matchDate = parse(m.date, "yyyy-MM-dd", new Date());
      return matchDate < new Date(today.setHours(0, 0, 0, 0));
    });
  } else if (type === "upcoming") {
    filtered = matches.filter((m) => {
      if (!m.date) return false;
      const matchDate = parse(m.date, "yyyy-MM-dd", new Date());
      return matchDate >= new Date(today.setHours(0, 0, 0, 0));
    });
  }
  return Response.json({ matches: filtered });
}

const matchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  time: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm
  courtNumber: z.string().optional(),
  costCourt: z.string().optional(),
  costShirts: z.string().optional(),
  status: z.string().optional(),
});

// POST /api/matches: Add a new match (sheet + metadata, organizer only)
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user || user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await req.json();
  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      "Invalid input: " + JSON.stringify(parsed.error.format()),
      { status: 400 },
    );
  }
  const { date, time, courtNumber, costCourt, costShirts, status } =
    parsed.data;
  if (!date || !time) {
    return new Response("Missing required fields", { status: 400 });
  }
  // Prevent duplicate matches on the same day
  const allMatches = await getAllMatchesMetadata();
  const newDate = parse(date, "yyyy-MM-dd", new Date());
  const hasSameDay = allMatches.some((m) => {
    if (!m.date) return false;
    const matchDate = parse(m.date, "yyyy-MM-dd", new Date());
    return isSameDay(newDate, matchDate);
  });
  if (hasSameDay) {
    return new Response("A match already exists for this date.", {
      status: 409,
    });
  }
  // Generate a sheet name and create the match sheet/tab
  const sheetName = `${date} ${time}`;
  const sheetProps = await createMatchSheet(sheetName);
  const sheetGid = sheetProps.sheetId?.toString() || "";
  // Use sheetGid as matchId
  const matchId = sheetGid;

  const meta: MatchMetadata = {
    matchId,
    sheetName,
    sheetGid,
    date: String(date), // YYYY-MM-DD
    time: String(time),
    courtNumber: courtNumber || "",
    status: status || "upcoming",
    costCourt: costCourt || "",
    costShirts: costShirts || "",
  };

  await addMatchMetadata(meta);
  return Response.json({ match: meta });
}
