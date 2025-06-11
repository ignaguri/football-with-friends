import { getMatchSheetData } from "@/lib/google-sheets";

export async function GET(
  request: Request,
  context: { params: { matchId: string } },
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
