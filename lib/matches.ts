import { parse, isAfter, isEqual, isBefore } from "date-fns";

import { getAllMatchesMetadata } from "@/lib/google-sheets";

export interface Match {
  matchId: string;
  name: string;
  date: string;
  time: string;
  status?: string;
  courtNumber?: string;
  costCourt?: string;
  costShirts?: string;
}

export async function getMatchesFromSheets(): Promise<{ matches: Match[] }> {
  // Debug: log environment
  // eslint-disable-next-line no-console
  console.log("[getMatchesFromSheets] NODE_ENV:", process.env.NODE_ENV);
  const all = await getAllMatchesMetadata();
  // Debug: log raw data
  // eslint-disable-next-line no-console
  console.log("[getMatchesFromSheets] all matches metadata:", all);
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
  // Debug: log filtered matches
  // eslint-disable-next-line no-console
  console.log("[getMatchesFromSheets] filtered matches:", matches);
  return { matches };
}

export async function getPastMatchesFromSheets(): Promise<{
  matches: Match[];
}> {
  // Debug: log environment
  // eslint-disable-next-line no-console
  console.log("[getPastMatchesFromSheets] NODE_ENV:", process.env.NODE_ENV);
  const all = await getAllMatchesMetadata();
  // Debug: log raw data
  // eslint-disable-next-line no-console
  console.log("[getPastMatchesFromSheets] all matches metadata:", all);
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
  // Debug: log filtered matches
  // eslint-disable-next-line no-console
  console.log("[getPastMatchesFromSheets] filtered matches:", matches);
  return { matches };
}
