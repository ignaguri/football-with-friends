import { parse, isAfter, isEqual } from "date-fns";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { listMatchSheets, createMatchSheet } from "@/lib/google-sheets";

function parseMatchDate(name: string): Date | null {
  // Expecting 'DD-MM-YYYY' or 'DD-MM-YYYY ...'
  const match = name.match(/\b(\d{2})-(\d{2})-(\d{4})\b/);
  if (!match) return null;
  const date = parse(match[0], "dd-MM-yyyy", new Date());
  return isNaN(date.getTime()) ? null : date;
}

// GET /api/matches: Returns list of future match sheets, sorted by date (next first)
export async function GET() {
  const sheets = await listMatchSheets();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const matches = sheets
    .map((sheet) => {
      const name = sheet.properties?.title || "";
      const date = parseMatchDate(name);
      return {
        id: sheet.properties?.sheetId,
        name,
        index: sheet.properties?.index,
        date,
      };
    })
    .filter((m) => m.date && (isAfter(m.date, today) || isEqual(m.date, today)))
    .sort((a, b) => a.date!.getTime() - b.date!.getTime());
  return Response.json({ matches });
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
