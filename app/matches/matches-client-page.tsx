"use client";

import { format, isValid, parse } from "date-fns";
import Link from "next/link";

import type { Match, MatchMetadata } from "@/lib/types";

import { useGetMatches } from "@/hooks/use-matches";

function MatchTable({ matches, title }: { matches: Match[]; title: string }) {
  return (
    <div className="w-full p-4">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-semibold">
                Date
              </th>
              <th className="px-4 py-2 text-left text-sm font-semibold">
                Time
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-4 text-center text-gray-400 dark:text-gray-500"
                >
                  No matches found.
                </td>
              </tr>
            ) : (
              matches.map((match, idx) => {
                // Only parse YYYY-MM-DD
                const parsedDate = parse(match.date, "yyyy-MM-dd", new Date());
                return (
                  <tr
                    key={match.matchId || match.name || idx}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-2">
                      {parsedDate && isValid(parsedDate)
                        ? format(parsedDate, "dd MMM yyyy")
                        : "-"}
                    </td>
                    <td className="px-4 py-2">{match.time || "-"}</td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/matches/${encodeURIComponent(match.matchId)}`}
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchesSkeleton({ title }: { title: string }) {
  return (
    <div className="w-full p-4">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-10 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    </div>
  );
}

function MatchesList({
  type,
  title,
}: {
  type: "upcoming" | "past";
  title: string;
}) {
  const { data, isLoading, isError } = useGetMatches(type);

  if (isLoading) {
    return <MatchesSkeleton title={title} />;
  }

  if (isError) {
    return (
      <div className="w-full p-4">
        <h2 className="mb-4 text-2xl font-bold">{title}</h2>
        <p className="text-red-500">Failed to load matches.</p>
      </div>
    );
  }

  // Map MatchMetadata[] to Match[]
  const matches: Match[] = (data?.matches || []).map((meta: MatchMetadata) => ({
    matchId: meta.matchId,
    name: meta.sheetName,
    date: meta.date,
    time: meta.time,
    status: meta.status,
    courtNumber: meta.courtNumber,
    costCourt: meta.costCourt,
    costShirts: meta.costShirts,
  }));

  return <MatchTable matches={matches} title={title} />;
}

export function MatchesClientPage() {
  return (
    <div className="flex w-full flex-col gap-8 p-4">
      <MatchesList type="upcoming" title="Upcoming Matches" />
      <MatchesList type="past" title="Past Matches" />
    </div>
  );
}
