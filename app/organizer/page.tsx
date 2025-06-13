"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EditMatchForm } from "./edit-match-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/lib/auth-client";
import { PLAYER_STATUSES } from "@/lib/types";

type Match = {
  matchId: string;
  date: string;
  time: string;
  courtNumber: string;
  status: string;
  costCourt: string;
  costShirts: string;
};

async function fetchMatches(): Promise<Match[]> {
  const res = await fetch("/api/matches", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch matches");
  const data = await res.json();
  return data.matches || [];
}

export default function OrganizerDashboard() {
  const { data: session, isPending } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editForm, setEditForm] = useState<Match | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [playerDrawerMatchId, setPlayerDrawerMatchId] = useState<string | null>(
    null,
  );
  const [playerDrawerOpen, setPlayerDrawerOpen] = useState(false);
  const [playerList, setPlayerList] = useState<any[]>([]);
  const [playerListLoading, setPlayerListLoading] = useState(false);
  const [playerListError, setPlayerListError] = useState<string | null>(null);
  const [cancellingPlayer, setCancellingPlayer] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    fetchMatches()
      .then(setMatches)
      .catch((e) => {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleDelete = async (matchId: string) => {
    setDeletingId(matchId);
    try {
      const res = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete match");
      setMatches((prev) => prev.filter((m) => m.matchId !== matchId));
      toast.success("Match deleted successfully");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  function handleEditClick(match: Match) {
    setEditingMatch(match);
    setEditForm({ ...match });
  }

  function handleEditCancel() {
    setEditingMatch(null);
    setEditForm(null);
  }

  async function handleEditSave(updated: Match) {
    setEditLoading(true);
    setError(null);
    try {
      const { matchId, ...updates } = updated;
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update match");
      setMatches((prev) =>
        prev.map((m) => (m.matchId === matchId ? { ...m, ...updates } : m)),
      );
      setEditingMatch(null);
      setEditForm(null);
      toast.success("Match updated successfully");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setEditLoading(false);
    }
  }

  async function openPlayerDrawer(matchId: string) {
    setPlayerDrawerMatchId(matchId);
    setPlayerDrawerOpen(true);
    setPlayerListLoading(true);
    setPlayerListError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (!res.ok) throw new Error("Failed to fetch players");
      const data = await res.json();
      setPlayerList(data.players);
    } catch (e: any) {
      const message = e.message || "Error loading players";
      setPlayerListError(message);
      toast.error(message);
    } finally {
      setPlayerListLoading(false);
    }
  }

  async function handleCancelPlayer(matchId: string, player: any) {
    setCancellingPlayer(player.Email);
    try {
      const res = await fetch(`/api/matches/${matchId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: player.Name,
          playerEmail: player.Email,
          status: PLAYER_STATUSES[2],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Cancelled ${player.Name}`);
      // Refetch player list
      const refRes = await fetch(`/api/matches/${matchId}`);
      if (refRes.ok) {
        const data = await refRes.json();
        setPlayerList(data.players);
      }
    } catch (e: any) {
      toast.error(e.message || "Could not cancel player");
    } finally {
      setCancellingPlayer(null);
    }
  }

  if (isPending) {
    return (
      <main className="container mx-auto p-4">
        <Skeleton className="mb-4 h-10 w-1/2" />
        <Skeleton className="mb-2 h-6 w-1/3" />
        <div className="overflow-x-auto rounded-lg border bg-white shadow dark:bg-gray-900">
          <Table>
            <TableHeader>
              <TableRow>
                {[...Array(8)].map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-6 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container mx-auto p-8 text-center">
        <h1 className="mb-4 text-2xl font-bold">Organizer Dashboard</h1>
        <p className="text-red-600">
          You are not authorized to view this page.
        </p>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
        <p className="text-gray-600">
          Manage all matches, edit details, or remove matches.
        </p>
        {error && (
          <div className="my-4 rounded bg-red-100 p-4 text-red-700">
            {error}
          </div>
        )}
        <div className="mt-4 overflow-x-auto rounded-lg border bg-white shadow dark:bg-gray-900">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-900 dark:text-gray-100">
                  Date
                </TableHead>
                <TableHead className="text-gray-900 dark:text-gray-100">
                  Time
                </TableHead>
                <TableHead className="text-gray-900 dark:text-gray-100">
                  Court
                </TableHead>
                <TableHead className="text-gray-900 dark:text-gray-100">
                  Status
                </TableHead>
                <TableHead className="text-gray-900 dark:text-gray-100">
                  Cost € (Court)
                </TableHead>
                <TableHead className="text-gray-900 dark:text-gray-100">
                  Cost € (Shirts)
                </TableHead>
                <TableHead className="text-gray-900 dark:text-gray-100">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(8)].map((_, j) => (
                      <TableCell
                        key={j}
                        className="text-gray-900 dark:text-gray-100"
                      >
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : matches.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-gray-400 dark:text-gray-500"
                  >
                    No matches found.
                  </TableCell>
                </TableRow>
              ) : (
                matches.map((m) => (
                  <TableRow key={m.matchId}>
                    <TableCell className="text-gray-900 dark:text-gray-100">
                      {m.date}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100">
                      {m.time}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100">
                      {m.courtNumber}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100">
                      {m.status}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100">
                      {m.costCourt}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100">
                      {m.costShirts}
                    </TableCell>
                    <TableCell className="flex gap-2 text-gray-900 dark:text-gray-100">
                      <Drawer
                        open={editingMatch?.matchId === m.matchId}
                        onOpenChange={(open) => {
                          if (!open) handleEditCancel();
                        }}
                      >
                        <DrawerTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditClick(m)}
                            disabled={deletingId === m.matchId}
                          >
                            Edit
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent>
                          <DrawerHeader>
                            <DrawerTitle>Edit Match</DrawerTitle>
                            <DrawerDescription>
                              Update the match details below and save your
                              changes.
                            </DrawerDescription>
                          </DrawerHeader>
                          {editForm && (
                            <EditMatchForm
                              match={editForm}
                              onSave={handleEditSave}
                              onCancel={handleEditCancel}
                            />
                          )}
                        </DrawerContent>
                      </Drawer>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === m.matchId}
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Match</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this match? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(m.matchId)}
                              disabled={deletingId === m.matchId}
                            >
                              Confirm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPlayerDrawer(m.matchId)}
                        disabled={deletingId === m.matchId}
                      >
                        View Players
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <Drawer open={playerDrawerOpen} onOpenChange={setPlayerDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Players</DrawerTitle>
            <DrawerDescription>
              {playerDrawerMatchId &&
                `Players for match ${matches.find((m) => m.matchId === playerDrawerMatchId)?.date || ""}`}
            </DrawerDescription>
          </DrawerHeader>
          {playerListLoading ? (
            <div className="p-4">Loading...</div>
          ) : playerListError ? (
            <div className="p-4 text-red-600">{playerListError}</div>
          ) : playerList.length === 0 ? (
            <div className="p-4 text-gray-500">No players found.</div>
          ) : (
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerList.map((player) => (
                    <TableRow key={player.Email}>
                      <TableCell>{player.Name}</TableCell>
                      <TableCell>{player.Email}</TableCell>
                      <TableCell>{player.Status}</TableCell>
                      <TableCell>
                        {player.Status !== PLAYER_STATUSES[2] ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={cancellingPlayer === player.Email}
                            onClick={() =>
                              handleCancelPlayer(playerDrawerMatchId!, player)
                            }
                          >
                            {cancellingPlayer === player.Email
                              ? "Cancelling..."
                              : "Cancel"}
                          </Button>
                        ) : (
                          <span className="text-red-500">Cancelled</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </main>
  );
}
