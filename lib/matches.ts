import { parse, isAfter, isEqual } from "date-fns";

import { listMatchSheets } from "@/lib/google-sheets";

function parseMatchDate(name: string): Date | null {
  // Expecting 'DD-MM-YYYY' or 'DD-MM-YYYY ...'
  const match = name.match(/\b(\d{2})-(\d{2})-(\d{4})\b/);
  if (!match) return null;
  const date = parse(match[0], "dd-MM-yyyy", new Date());
  return isNaN(date.getTime()) ? null : date;
}

export async function getMatchesFromSheets() {
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
  return { matches };
}
