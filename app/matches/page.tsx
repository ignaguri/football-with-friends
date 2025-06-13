import { parse, isValid, format } from "date-fns";
import Link from "next/link";

import type { Match } from "@/lib/matches";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMatchesFromSheets } from "@/lib/matches";

async function getMatches(): Promise<{ matches: Match[] }> {
  return getMatchesFromSheets();
}

export default async function MatchListPage() {
  const { matches }: { matches: Match[] } = await getMatches();

  return (
    <div className="w-full p-4">
      <h2 className="mb-4 text-2xl font-bold">Upcoming Matches</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match: Match, idx: number) => {
            const parsedDate = parse(match.date, "yyyy-MM-dd", new Date());
            return (
              <TableRow key={match.matchId || match.name || idx}>
                <TableCell>
                  {parsedDate && isValid(parsedDate)
                    ? format(parsedDate, "dd MMM yyyy")
                    : "-"}
                </TableCell>
                <TableCell>{match.time || "-"}</TableCell>
                <TableCell>
                  <Link
                    href={`/matches/${encodeURIComponent(match.matchId)}`}
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
