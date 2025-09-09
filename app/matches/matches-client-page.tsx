"use client";

import { useGetMatches } from "@/hooks/use-matches";
import { format, isValid, parse } from "date-fns";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { MatchDisplay } from "@/lib/mappers/display-mappers";

function MatchTable({
  matches,
  title,
}: {
  matches: MatchDisplay[];
  title: string;
}) {
  const t = useTranslations();
  return (
    <div className="w-full p-4">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-semibold">
                {t("shared.date")}
              </th>
              <th className="px-4 py-2 text-left text-sm font-semibold">
                {t("shared.time")}
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
                  {t("matches.none")}
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
                        {t("matches.view")}
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
  const t = useTranslations();
  const { data, isLoading, isError } = useGetMatches(type);

  if (isLoading) {
    return <MatchesSkeleton title={title} />;
  }

  if (isError) {
    return (
      <div className="w-full p-4">
        <h2 className="mb-4 text-2xl font-bold">{title}</h2>
        <p className="text-red-500">{t("matches.error")}</p>
      </div>
    );
  }

  // Data is already in display format from API
  const matches: MatchDisplay[] = data?.matches || [];

  return <MatchTable matches={matches} title={title} />;
}

export function MatchesClientPage() {
  const t = useTranslations("matches");
  return (
    <div className="flex w-full flex-col gap-8 p-4">
      <MatchesList type="upcoming" title={t("upcoming")} />
      <MatchesList type="past" title={t("past")} />
    </div>
  );
}
