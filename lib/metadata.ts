import type { Metadata } from "next/types";

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: "https://football-with-friends.vercel.app",
      images: "https://football-with-friends.vercel.app/og.png",
      siteName: "Fútbol con los pibes",
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
