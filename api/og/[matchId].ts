import { ImageResponse } from "@vercel/og";
import { formatInTimeZone } from "date-fns-tz";
import { createElement } from "react";

export const config = { runtime: "edge" };

const APP_TIMEZONE = process.env.DEFAULT_TIMEZONE || "Europe/Berlin";

interface MatchPreview {
  date: string;
  time: string;
  maxPlayers: number;
  location?: { name: string } | null;
}

export default async function handler(request: Request) {
  const apiBase = process.env.EXPO_PUBLIC_API_URL;
  if (!apiBase) return new Response("Misconfigured", { status: 500 });

  const url = new URL(request.url);
  const rawMatchId = url.pathname.split("/og/")[1]?.split(/[/?#]/)[0];
  if (!rawMatchId) return new Response("Bad request", { status: 400 });

  let matchId: string;
  try {
    matchId = decodeURIComponent(rawMatchId);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  let match: MatchPreview;
  try {
    const res = await fetch(
      `${apiBase}/api/matches/${encodeURIComponent(matchId)}/preview`,
    );
    if (!res.ok) return new Response("Not found", { status: 404 });
    match = (await res.json()) as MatchPreview;
  } catch {
    return new Response("Upstream error", { status: 502 });
  }

  const dateLine = formatInTimeZone(
    match.date,
    APP_TIMEZONE,
    "EEEE, MMMM d, yyyy",
  );
  const subtitle = `${match.time}hs · ${match.location?.name ?? "TBD"} · ${match.maxPlayers} players`;

  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a3d2c 0%, #1a7a55 100%)",
          color: "white",
          padding: 80,
        },
      },
      createElement(
        "div",
        { style: { fontSize: 36, opacity: 0.85, marginBottom: 16 } },
        "⚽ Fútbol con los pibes",
      ),
      createElement(
        "div",
        {
          style: {
            fontSize: 80,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.1,
          },
        },
        dateLine,
      ),
      createElement(
        "div",
        {
          style: {
            fontSize: 44,
            opacity: 0.95,
            marginTop: 32,
            textAlign: "center",
          },
        },
        subtitle,
      ),
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
