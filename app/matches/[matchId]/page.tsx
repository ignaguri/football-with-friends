import type { Metadata } from "next";

import MatchClientPage from "./MatchClientPage";
import { createMetadata } from "@/lib/metadata";
import { formatMatchTitle } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>;
}): Promise<Metadata> {
  const { matchId } = await params;
  const decodedMatchId = decodeURIComponent(matchId);
  const baseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://footballwithfriends.vercel.app";
  try {
    const res = await fetch(
      `${baseUrl}/api/matches/${encodeURIComponent(decodedMatchId)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error("Match not found");
    const data = await res.json();
    const meta = data.meta || {};
    // Format date/time for title/description
    let matchTitle = meta.sheetName || decodedMatchId;
    const formatted = formatMatchTitle(meta.date, meta.time, "en-US");
    if (formatted) matchTitle = formatted;
    const description = `Join the football match on ${matchTitle}${meta.courtNumber ? `, Court #${meta.courtNumber}` : ""}${meta.costCourt ? `, €${meta.costCourt} p.p.` : ""}. Organized with Fútbol con los pibes.`;
    return createMetadata({
      title: `Football Match – ${matchTitle}`,
      description,
      openGraph: {
        url: `${baseUrl}/matches/${encodeURIComponent(matchId)}`,
        images: [
          {
            url: `${baseUrl}/og.png`,
            width: 1200,
            height: 630,
            alt: "Fútbol con los pibes – Football Match",
          },
        ],
      },
      twitter: {
        title: `Football Match – ${matchTitle}`,
        description,
        images: [`${baseUrl}/og.png`],
      },
    });
  } catch {
    return createMetadata({
      title: "Football Match | Fútbol con los pibes",
      description: "Join a football match organized with Fútbol con los pibes.",
    });
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  await params;
  await searchParams;
  return <MatchClientPage />;
}
