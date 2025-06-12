"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

import type { ColumnDef, SortingState } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/lib/auth-client";
import { capitalize } from "@/lib/utils";

interface Player {
  [key: string]: string;
}

interface NotifyOrganizerDialogProps {
  displayDate: string;
  userName: string;
}

function NotifyOrganizerDialog({
  displayDate,
  userName,
}: NotifyOrganizerDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="inline-block h-full rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
        >
          I paid
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="notify-organizer">
        <DialogHeader>
          <DialogTitle>
            If you already paid, you can notify the organizer via WhatsApp
          </DialogTitle>
        </DialogHeader>
        <DialogFooter className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <a
            href={`https://wa.me/4917662232065?text=${encodeURIComponent(
              `Hola! Ya pagué mi partido para el ${displayDate} - ${userName}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button variant="default" className="w-full">
              Send WhatsApp message
            </Button>
          </a>
          <DialogClose asChild>
            <Button variant="outline" className="w-full">
              I already sent the message
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MatchPage() {
  const { matchId: rawMatchId } = useParams<{ matchId: string }>();
  const { data: session, isPending: isSessionPending } = useSession();
  const user = session?.user;
  const [header, setHeader] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Decode matchId for display and WhatsApp
  const matchId = decodeURIComponent(rawMatchId || "");

  // Try to parse and format the matchId as 'dd-MM-yyyy HH:mm' using Intl
  let displayMatch = matchId;
  let displayDate = matchId;
  try {
    // Match format: 'DD-MM-YYYY HH:mm'
    const match = matchId.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/);
    if (match) {
      const [_, day, month, year, hour, minute] = match;
      const dateObj = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
      );
      // Use user's locale if available, fallback to 'en'
      const locale =
        typeof navigator !== "undefined" && navigator.language
          ? navigator.language
          : "en";
      displayMatch = new Intl.DateTimeFormat(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(dateObj);
      // WhatsApp message: dd-MM-yyyy HH:mm
      const pad = (n: number) => n.toString().padStart(2, "0");
      displayDate = `${pad(dateObj.getDate())}-${pad(dateObj.getMonth() + 1)}-${dateObj.getFullYear()} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
    }
  } catch {}

  useEffect(() => {
    async function fetchMatch() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/matches/${matchId}`);
        if (!res.ok) throw new Error("Match not found");
        const data = await res.json();
        setHeader(data.header);
        setPlayers(data.players);
        if (user) {
          setJoined(data.players.some((p: Player) => p.Email === user.email));
        }
      } catch (e: any) {
        setError(e.message || "Error loading match");
      } finally {
        setIsLoading(false);
      }
    }
    if (matchId) fetchMatch();
  }, [matchId, user?.email]);

  async function handleJoin() {
    if (!user) return;
    setIsJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: user.name,
          playerEmail: user.email,
          paid: false,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setJoined(true);
      // Refetch players
      const matchRes = await fetch(`/api/matches/${matchId}`);
      if (matchRes.ok) {
        const data = await matchRes.json();
        setPlayers(data.players);
      }
    } catch (e: any) {
      setError(e.message || "Could not join match");
    } finally {
      setIsJoining(false);
    }
  }

  // Handler for admin to mark a player as paid
  async function handleMarkAsPaid(playerEmail: string, playerName: string) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName,
          playerEmail,
          paid: true,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      // Refetch players
      const matchRes = await fetch(`/api/matches/${matchId}`);
      if (matchRes.ok) {
        const data = await matchRes.json();
        setPlayers(data.players);
      }
    } catch (e: any) {
      setError(e.message || "Could not update payment");
    } finally {
      setIsLoading(false);
    }
  }

  // Define columns for TanStack Table
  const columns = useMemo<ColumnDef<Player, unknown>[]>(
    () => [
      // Add index column as the first column
      {
        id: "number",
        header: "#",
        cell: (info: { row: { index: number } }) => info.row.index + 1,
        size: 32,
      },
      // Then the rest of the columns (except Email)
      ...header
        .filter((col) => col !== "Email")
        .map((col) => ({
          accessorKey: col,
          header: col,
          enableSorting: col !== "Paid",
          cell: (info: { row: { original: Player } }) => {
            const player = info.row.original;
            if (col === "Paid" && player[col] !== "PAID") {
              if (user?.role === "admin") {
                return (
                  <Button
                    size="sm"
                    className="bg-green-700/70 text-white hover:bg-green-700"
                    onClick={() =>
                      handleMarkAsPaid(player["Email"], player["Name"])
                    }
                    disabled={isLoading}
                  >
                    Mark as Paid
                  </Button>
                );
              } else if (player["Email"] === user?.email) {
                return (
                  <div className="flex items-center gap-2">
                    <a
                      href="http://paypal.me/federicolucero510"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block h-full rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                    >
                      Pay
                    </a>
                    {user && (
                      <NotifyOrganizerDialog
                        displayDate={displayDate}
                        userName={user.name}
                      />
                    )}
                  </div>
                );
              }
            }
            if (player[col] === "PAID") {
              return (
                <Badge className="rounded-xl" variant="success">
                  PAID
                </Badge>
              );
            }
            return player[col];
          },
        })),
    ],
    [header, user, isLoading, displayDate],
  );

  const table = useReactTable({
    data: players,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  if (isLoading || isSessionPending) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading...</div>
    );
  }
  if (error) {
    return <div className="py-8 text-center text-destructive">{error}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <h2 className="mb-4 break-words text-2xl font-bold">
        {capitalize(displayMatch)}
      </h2>
      {/* Counters for sign-ups and paid players */}
      <div className="mb-4 flex flex-row gap-2">
        <div className="flex-1 rounded bg-blue-100 px-2 py-1 text-center text-blue-800">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-blue-600">
            Signed Up
          </span>
          <span className="text-lg font-bold">{players.length}</span>
        </div>
        <div className="flex-1 rounded bg-green-100 px-2 py-1 text-center text-green-800">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-green-600">
            Paid
          </span>
          <span className="text-lg font-bold">
            {players.filter((p) => p.Paid === "PAID").length}
          </span>
        </div>
      </div>
      <Table>
        <TableHeader>
          {table
            .getHeaderGroups()
            .map(
              (
                headerGroup: ReturnType<typeof table.getHeaderGroups>[number],
              ) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(
                    (header: (typeof headerGroup.headers)[number]) => {
                      const canSort = header.column.getCanSort();
                      const isSorted = header.column.getIsSorted();
                      return (
                        <TableHead
                          key={header.id}
                          onClick={
                            canSort
                              ? header.column.getToggleSortingHandler()
                              : undefined
                          }
                          className={
                            canSort ? "cursor-pointer select-none" : undefined
                          }
                        >
                          <span className="flex items-center gap-1">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {canSort && (
                              <span className="text-xs">
                                {isSorted === "asc"
                                  ? "▲"
                                  : isSorted === "desc"
                                    ? "▼"
                                    : ""}
                              </span>
                            )}
                          </span>
                        </TableHead>
                      );
                    },
                  )}
                </TableRow>
              ),
            )}
        </TableHeader>
        <TableBody>
          {table
            .getRowModel()
            .rows.map(
              (row: ReturnType<typeof table.getRowModel>["rows"][number]) => (
                <TableRow key={row.id}>
                  {row
                    .getVisibleCells()
                    .map(
                      (
                        cell: ReturnType<typeof row.getVisibleCells>[number],
                      ) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ),
                    )}
                </TableRow>
              ),
            )}
        </TableBody>
      </Table>
      {user && !joined && (
        <div className="mt-6 flex justify-center">
          <Button onClick={handleJoin} disabled={isJoining}>
            {isJoining ? "Joining..." : "Join Match"}
          </Button>
        </div>
      )}
      {user && joined && (
        <div className="mt-6 text-center font-medium text-green-600">
          You have joined this match.
        </div>
      )}
    </div>
  );
}
