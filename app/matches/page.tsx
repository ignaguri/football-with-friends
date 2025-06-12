import { format } from "date-fns";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBaseUrl } from "@/lib/getBaseUrl";

async function getMatches() {
  const baseUrl = getBaseUrl();
  console.log("[getMatches] baseUrl:", baseUrl);
  const res = await fetch(`${baseUrl}/api/matches`, {
    cache: "no-store",
  });
  console.log("[getMatches] response status:", res.status);
  if (!res.ok) {
    let errorBody;
    try {
      errorBody = await res.text();
    } catch (e) {
      errorBody = "[unreadable body]";
    }
    console.error("[getMatches] Fetch failed:", res.status, errorBody);
    return { matches: [] };
  }
  const data = await res.json();
  console.log("[getMatches] matches:", data.matches);
  return data;
}

export default async function MatchListPage() {
  const { matches } = await getMatches();
  console.log("[MatchListPage] matches count:", matches.length);

  return (
    <div className="w-full p-4">
      <h2 className="mb-4 text-2xl font-bold">Upcoming Matches</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Match Name</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match: any) => (
            <TableRow key={match.id}>
              <TableCell>
                {match.date ? format(new Date(match.date), "dd MMM yyyy") : "-"}
              </TableCell>
              <TableCell>{match.name}</TableCell>
              <TableCell>
                <Link
                  href={`/matches/${encodeURIComponent(match.name)}`}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
