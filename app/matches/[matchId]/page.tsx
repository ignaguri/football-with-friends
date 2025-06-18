"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
} from "@tanstack/react-table";
import { parse, addHours } from "date-fns";
import { Share2, Calendar as CalendarIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/auth-client";
import { PLAYER_STATUSES } from "@/lib/types";
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

// Zod schema for guest form (move outside component)
const guestSchema = z.object({
  guestName: z.string().max(50, "Name too long").optional(),
});
type GuestFormValues = z.infer<typeof guestSchema>;

export default function MatchPage() {
  const { matchId: rawMatchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const user = session?.user;
  const [header, setHeader] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [isGuestDialogOpen, setIsGuestDialogOpen] = useState(false);
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [matchMeta, setMatchMeta] = useState<{
    date?: string;
    time?: string;
    costCourt?: string;
    courtNumber?: string;
  } | null>(null);
  const [isShareDrawerOpen, setIsShareDrawerOpen] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState("Copy link");
  const { toast: showToast } = useToast();

  // Decode matchId for display and WhatsApp
  const matchId = decodeURIComponent(rawMatchId || "");

  // Format match title (date + time) before columns and NotifyOrganizerDialog usage
  let matchTitle = matchId;
  if (matchMeta?.date && matchMeta?.time) {
    try {
      const dateTimeString = `${matchMeta.date} ${matchMeta.time}`;
      const dateObj = parse(dateTimeString, "yyyy-MM-dd HH:mm", new Date());
      matchTitle = new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(dateObj);
    } catch {}
  }

  // Compute match URL for sharing
  const matchUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://footballwithfriends.vercel.app/matches/${encodeURIComponent(matchId)}`;

  // WhatsApp share text (memoized)
  const shareText = useMemo(
    () => `Join the football match - ${matchTitle} -\n${matchUrl}`,
    [matchTitle, matchUrl],
  );

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
        // Try to get date and time from API response if available
        if (data.meta) {
          setMatchMeta({
            date: data.meta.date,
            time: data.meta.time,
            costCourt: data.meta.costCourt,
            courtNumber: data.meta.courtNumber,
          });
        }
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
          status: PLAYER_STATUSES[1],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setJoined(true);
      toast.success("Signed up for the match!");
      // Refetch players
      const matchRes = await fetch(`/api/matches/${matchId}`);
      if (matchRes.ok) {
        const data = await matchRes.json();
        setPlayers(data.players);
      }
    } catch (e: any) {
      setError(e.message || "Could not join match");
      toast.error(e.message || "Could not join match");
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
          status: PLAYER_STATUSES[0],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Marked as paid");
      // Refetch players
      const matchRes = await fetch(`/api/matches/${matchId}`);
      if (matchRes.ok) {
        const data = await matchRes.json();
        setPlayers(data.players);
      }
    } catch (e: any) {
      setError(e.message || "Could not update payment");
      toast.error(e.message || "Could not update payment");
    } finally {
      setIsLoading(false);
    }
  }

  // Find the current user's player row
  const currentPlayer = players.find((p) => p.Email === user?.email);
  const isUserCancelled = currentPlayer?.Status === PLAYER_STATUSES[2];

  async function handleCancel() {
    if (!user) return;
    setIsCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: user.name,
          playerEmail: user.email,
          status: PLAYER_STATUSES[2],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCancelled(true);
      toast.success("Cancelled your spot");
      // Refetch players
      const matchRes = await fetch(`/api/matches/${matchId}`);
      if (matchRes.ok) {
        const data = await matchRes.json();
        setPlayers(data.players);
      }
    } catch (e: any) {
      setError(e.message || "Could not cancel spot");
      toast.error(e.message || "Could not cancel spot");
    } finally {
      setIsCancelling(false);
    }
  }

  // Count available spots (max 10)
  const paidCount = players.filter(
    (p) => p.Status === PLAYER_STATUSES[0],
  ).length;
  const totalSpots = 10;
  const spotsLeft = totalSpots - players.length;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GuestFormValues>({
    resolver: zodResolver(guestSchema),
  });

  async function handleAddGuestRHF(data: GuestFormValues) {
    if (!user) return;
    setIsAddingGuest(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isGuest: true,
          ownerName: user.name,
          ownerEmail: user.email,
          guestName: data.guestName?.trim() || undefined,
          status: PLAYER_STATUSES[1],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      reset();
      setIsGuestDialogOpen(false);
      toast.success("Guest added!");
      // Refetch players
      const matchRes = await fetch(`/api/matches/${matchId}`);
      if (matchRes.ok) {
        const data = await matchRes.json();
        setPlayers(data.players);
      }
    } catch (e: any) {
      setError(e.message || "Could not add guest");
      toast.error(e.message || "Could not add guest");
    } finally {
      setIsAddingGuest(false);
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
      // Then the rest of the columns (except Email, IsGuest, OwnerEmail, GuestName)
      ...header
        .filter(
          (col) =>
            col !== "Email" &&
            col !== "IsGuest" &&
            col !== "OwnerEmail" &&
            col !== "GuestName",
        )
        .map((col) => ({
          accessorKey: col,
          header: col,
          enableSorting: col !== "Status",
          cell: (info: { row: { original: Player } }) => {
            const player = info.row.original;
            if (col === "Status") {
              // Map status to badge variant
              function getBadgeVariant(status: string) {
                if (status === PLAYER_STATUSES[0]) return "success";
                if (status === PLAYER_STATUSES[1]) return "default";
                if (status === PLAYER_STATUSES[2]) return "destructive";
                return "secondary";
              }
              // Show action buttons for PENDING if admin or current user
              if (player[col] === PLAYER_STATUSES[1]) {
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
                          displayDate={matchTitle}
                          userName={user.name}
                        />
                      )}
                    </div>
                  );
                }
              }
              // Otherwise, show badge for all statuses
              return (
                <Badge variant={getBadgeVariant(player[col])}>
                  {player[col]}
                </Badge>
              );
            }
            return player[col];
          },
        })),
    ],
    [header, user, isLoading, matchId, matchTitle],
  );

  const table = useReactTable({
    data: players,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  function handleCopyLink() {
    if (typeof window === "undefined") return;
    navigator.clipboard
      .writeText(matchUrl)
      .then(() => {
        setCopyButtonText("Copied!");
        showToast({
          title: "Link copied!",
          description: "You can now share it anywhere.",
        });
        setTimeout(() => setCopyButtonText("Copy link"), 2000);
      })
      .catch(() => {
        showToast({
          variant: "destructive",
          title: "Error",
          description: "Failed to copy link to clipboard.",
        });
      });
  }

  function handleShareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
    );
  }

  function handleAddToCalendar() {
    if (!matchMeta?.date || !matchMeta?.time) return;
    const startDate = matchMeta.date.replace(/-/g, "");
    const startTime = matchMeta.time.replace(":", "");
    // Use date-fns to add 1 hour to the start time
    const startDateTime = parse(
      `${matchMeta.date} ${matchMeta.time}`,
      "yyyy-MM-dd HH:mm",
      new Date(),
    );
    const end = addHours(startDateTime, 1);
    const endDate = end.toISOString().slice(0, 10).replace(/-/g, "");
    const endTime = end.toTimeString().slice(0, 5).replace(":", "");
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${startDate}T${startTime}00`,
      `DTEND:${endDate}T${endTime}00`,
      `SUMMARY:${matchTitle}`,
      `DESCRIPTION:Football match - ${matchTitle}`,
      `URL:${matchUrl}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `football-match-${matchMeta.date}.ics`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

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
      <div className="mb-4 flex flex-col items-stretch gap-2">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Add to calendar"
            className="mr-1"
            onClick={handleAddToCalendar}
          >
            <CalendarIcon className="size-5" />
          </Button>
          <Drawer open={isShareDrawerOpen} onOpenChange={setIsShareDrawerOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Share match"
                className="ml-2"
              >
                <Share2 className="size-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Share this match</DrawerTitle>
                <DrawerDescription>
                  Choose how you'd like to share:
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col gap-3 px-4">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleShareWhatsApp}
                >
                  Share via WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCopyLink}
                >
                  {copyButtonText}
                </Button>
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="ghost" className="w-full">
                    Close
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
        <h2 className="mt-2 break-words text-center text-2xl font-bold">
          {capitalize(matchTitle)}
        </h2>
      </div>
      <div className="mb-4 flex flex-row items-center justify-center gap-2">
        <div className="min-w-[90px] rounded bg-green-100 px-4 py-2 text-center text-green-800">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-green-600">
            Paid
          </span>
          <span className="text-lg font-bold">
            {paidCount}/{totalSpots}
          </span>
        </div>
        <div className="min-w-[90px] rounded bg-blue-100 px-4 py-2 text-center text-blue-800">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-blue-600">
            Cost (p.p.)
          </span>
          <span className="text-lg font-bold">
            {matchMeta?.costCourt ? `€${matchMeta.costCourt}` : "-"}
          </span>
        </div>
        <div className="min-w-[90px] rounded bg-yellow-100 px-4 py-2 text-center text-yellow-800">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-yellow-600">
            Court #
          </span>
          <span className="text-lg font-bold">
            {matchMeta?.courtNumber || "-"}
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
      {user && joined && !isUserCancelled && !cancelled && (
        <>
          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleCancel}
              disabled={isCancelling}
              variant="destructive"
            >
              {isCancelling ? "Cancelling..." : "Cancel my spot"}
            </Button>
          </div>
          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => setIsGuestDialogOpen(true)}
              disabled={spotsLeft < 1 || isAddingGuest}
              variant="secondary"
            >
              Sign up a guest
            </Button>
          </div>
          <Dialog open={isGuestDialogOpen} onOpenChange={setIsGuestDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sign up a guest</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleAddGuestRHF)}>
                <div className="mb-2">
                  <label
                    htmlFor="guest-name"
                    className="mb-1 block text-sm font-medium"
                  >
                    Guest's name (optional)
                  </label>
                  <Input
                    id="guest-name"
                    {...register("guestName")}
                    placeholder="Guest's name (optional)"
                    disabled={isAddingGuest || isSubmitting}
                  />
                  {errors.guestName && (
                    <p className="text-xs text-red-600">
                      {errors.guestName.message}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={isAddingGuest || isSubmitting || spotsLeft < 1}
                  >
                    {isAddingGuest || isSubmitting ? "Adding..." : "Add guest"}
                  </Button>
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        reset();
                      }}
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
      <div className="mt-4 flex justify-center">
        <Button variant="outline" onClick={() => router.push("/rules")}>
          View Rules
        </Button>
      </div>
      {user && (isUserCancelled || cancelled) && (
        <div className="mt-6 text-center font-medium text-red-600">
          You have cancelled your spot.
        </div>
      )}
    </div>
  );
}
