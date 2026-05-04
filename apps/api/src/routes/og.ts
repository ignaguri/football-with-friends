import { getServiceFactory } from "@repo/shared/services";
import { formatDisplayDate } from "@repo/shared/utils";
import { Hono } from "hono";
import { ImageResponse } from "workers-og";

const app = new Hono();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

app.get("/:matchId", async (c) => {
  const matchId = c.req.param("matchId");
  try {
    const match = await getServiceFactory().matchService.getMatchDetails(matchId);
    if (!match) return c.json({ error: "Match not found" }, 404);

    const dateLine = escapeHtml(
      formatDisplayDate(match.date, "EEEE, MMMM d, yyyy"),
    );
    const subtitle = escapeHtml(
      `${match.time}hs · ${match.location?.name ?? "TBD"} · ${match.maxPlayers} players`,
    );

    const html = `
      <div style="height:100%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#0a3d2c 0%,#1a7a55 100%);color:white;padding:80px;">
        <div style="font-size:36px;opacity:0.85;margin-bottom:16px;">⚽ Fútbol con los pibes</div>
        <div style="font-size:80px;font-weight:700;text-align:center;line-height:1.1;">${dateLine}</div>
        <div style="font-size:44px;opacity:0.95;margin-top:32px;text-align:center;">${subtitle}</div>
      </div>
    `;

    return new ImageResponse(html, {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return c.json({ error: "Failed to render OG image" }, 500);
  }
});

export default app;
