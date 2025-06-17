import type { Metadata } from "next/types";

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: "https://football-with-friends.vercel.app",
      images: "https://football-with-friends.vercel.app/og.png",
      siteName: "Football With Friends",
      ...override.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      creator: "@ignaguri",
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: "https://football-with-friends.vercel.app/og.png",
      ...override.twitter,
    },
  };
}

export const baseUrl =
  process.env.NODE_ENV === "development"
    ? new URL("http://localhost:3000")
    : new URL(`https://${process.env.VERCEL_URL!}`);
