import { next } from "@vercel/functions";

export const config = {
  matcher: "/matches/:matchId*",
};

const BOT_UA =
  /WhatsApp|TelegramBot|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot/i;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface MatchResponse {
  date: string;
  time: string;
  maxPlayers: number;
  location?: { name: string };
  signups?: unknown[];
}

function buildOgHtml(match: MatchResponse, pageUrl: string): string {
  const locationName = escapeHtml(match.location?.name || "TBD");
  const date = escapeHtml(formatDate(match.date));
  const time = escapeHtml(match.time);
  const playerCount = match.signups?.length || 0;
  const maxPlayers = match.maxPlayers;

  const title = `Football Match - ${date}`;
  const description = `${time}hs | ${locationName} | ${playerCount}/${maxPlayers} players signed up`;
  const safeUrl = escapeHtml(pageUrl);
  const ogImage = escapeHtml(new URL("/icons/icon-512x512.png", pageUrl).toString());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:site_name" content="Football with Friends">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">
  <meta http-equiv="refresh" content="0;url=${safeUrl}">
</head>
<body>
  <p>Redirecting to match details...</p>
</body>
</html>`;
}

export default async function middleware(request: Request) {
  const apiBase = process.env.EXPO_PUBLIC_API_URL;
  if (!apiBase) return next();

  const ua = request.headers.get("user-agent") || "";
  if (!BOT_UA.test(ua)) return next();

  const rawMatchId = new URL(request.url).pathname
    .split("/matches/")[1]
    ?.split(/[/?#]/)[0];
  if (!rawMatchId) return next();

  let matchId: string;
  try {
    matchId = decodeURIComponent(rawMatchId);
  } catch {
    return next();
  }

  try {
    const res = await fetch(
      `${apiBase}/api/matches/${encodeURIComponent(matchId)}`
    );
    if (!res.ok) return next();
    const match = (await res.json()) as MatchResponse;
    return new Response(buildOgHtml(match, request.url), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return next();
  }
}
