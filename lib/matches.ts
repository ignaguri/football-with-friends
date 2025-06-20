import { parse, isAfter, isEqual, isBefore } from "date-fns";

import type { Match } from "@/lib/types";

import { getAllMatchesMetadata } from "@/lib/google-sheets";

export async function getMatchesFromSheets(): Promise<{ matches: Match[] }> {
  const all = await getAllMatchesMetadata();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const matches = all
    .map((meta) => ({
      matchId: meta.matchId,
      name: meta.sheetName,
      date: meta.date,
      time: meta.time,
      status: meta.status,
      courtNumber: meta.courtNumber,
      costCourt: meta.costCourt,
      costShirts: meta.costShirts,
    }))
    .filter((m) => {
      if (!m.date) return false;
      const matchDate = parse(m.date, "yyyy-MM-dd", new Date());
      return isAfter(matchDate, today) || isEqual(matchDate, today);
    });

  return { matches };
}

export async function getPastMatchesFromSheets(): Promise<{
  matches: Match[];
}> {
  const all = await getAllMatchesMetadata();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const matches = all
    .map((meta) => ({
      matchId: meta.matchId,
      name: meta.sheetName,
      date: meta.date,
      time: meta.time,
      status: meta.status,
      courtNumber: meta.courtNumber,
      costCourt: meta.costCourt,
      costShirts: meta.costShirts,
    }))
    .filter((m) => {
      if (!m.date) return false;
      const matchDate = parse(m.date, "yyyy-MM-dd", new Date());
      return isBefore(matchDate, today);
    });

  return { matches };
}
