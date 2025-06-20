"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { parse, addHours } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { PlayerStatus } from "@/lib/types";
import type { ColumnDef, SortingState } from "@tanstack/react-table";

import { GuestSignupDialog } from "./components/guest-signup-dialog";
import { MatchActions } from "./components/match-actions";
import { MatchHeader } from "./components/match-header";
import { MatchStats } from "./components/match-stats";
import { NotifyOrganizerDialog } from "./components/notify-organizer-dialog";
import { PlayersTable } from "./components/players-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetMatch, useSignupPlayer } from "@/hooks/use-matches";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/auth-client";
import { PLAYER_STATUSES } from "@/lib/types";
import { formatMatchTitle } from "@/lib/utils";

interface Player {
  [key: string]: string;
}

export default function MatchClientPage() {
  const { matchId: rawMatchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const user = session?.user;

  const matchId = decodeURIComponent(rawMatchId || "");

  const {
    data: matchData,
    isLoading: isMatchLoading,
    // isError: isMatchError,
    error: matchError,
  } = useGetMatch(matchId);

  const { players = [], meta: matchMeta } = matchData || {};

  const signupMutation = useSignupPlayer();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [isGuestDialogOpen, setIsGuestDialogOpen] = useState(false);
  const [isShareDrawerOpen, setIsShareDrawerOpen] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState("Copy link");
  const { toast: showToast } = useToast();

  const isPlayerInMatch = useMemo(() => {
    if (!user) return false;
    const player = players.find((p) => p.Email === user.email);
    return player ? player.Status !== "CANCELLED" : false;
  }, [players, user]);

  const isCancelled = useMemo(() => {
    if (!user) return false;
    const player = players.find((p) => p.Email === user.email);
    return player?.Status === "CANCELLED";
  }, [players, user]);

  const matchTitle =
    formatMatchTitle(matchMeta?.date, matchMeta?.time) || matchId;
  const matchUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://footballwithfriends.vercel.app/matches/${encodeURIComponent(
          matchId,
        )}`;
  const shareText = useMemo(
    () => `Join the football match - ${matchTitle} -\n${matchUrl}`,
    [matchTitle, matchUrl],
  );

  const handleSignup = (payload: any, successMessage: string) => {
    signupMutation.mutate(
      { matchId, payload },
      {
        onSuccess: () => {
          toast.success(successMessage);
        },
        onError: (error) => {
          toast.error(error.message || "An error occurred");
        },
      },
    );
  };

  function handleJoin() {
    if (!user) return;
    handleSignup(
      {
        playerName: user.name,
        playerEmail: user.email,
        status: PLAYER_STATUSES[1], // PENDING
      },
      "Signed up for the match!",
    );
  }

  function handleMarkAsPaid(playerEmail: string, playerName: string) {
    handleSignup(
      {
        playerName,
        playerEmail,
        status: PLAYER_STATUSES[0], // PAID
      },
      "Marked as paid",
    );
  }

  function handleCancel() {
    if (!user) return;
    handleSignup(
      {
        playerName: user.name,
        playerEmail: user.email,
        status: "CANCELLED",
      },
      "You have cancelled your spot.",
    );
  }

  function handleAddGuest(guestName?: string) {
    if (!user) return;
    handleSignup(
      {
        isGuest: true,
        ownerName: user.name,
        ownerEmail: user.email,
        guestName,
        status: PLAYER_STATUSES[1], // PENDING
      },
      "Guest added successfully!",
    );
    setIsGuestDialogOpen(false);
  }

  function getBadgeVariant(status: PlayerStatus) {
    if (status === "PAID") return "success";
    if (status === "PENDING") return "default";
    if (status === "CANCELLED") return "destructive";
    return "secondary";
  }

  const columns: ColumnDef<Player>[] = useMemo(
    () => [
      {
        accessorKey: "Name",
        header: "Name",
      },
      {
        accessorKey: "Status",
        header: "Status",
        cell: ({ row }) => {
          const player = row.original;
          const status = player.Status?.toUpperCase();
          return (
            <Badge variant={getBadgeVariant(status as PlayerStatus)}>
              {status}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const player = row.original;
          const status = (player.Status as PlayerStatus)?.toUpperCase();
          const isCurrentUser = user?.email === player.Email;

          const showPaymentButtons = isCurrentUser && user;
          const showAdminButtons = user?.role === "admin";

          if (status !== "PENDING") {
            return null;
          }

          return (
            <div className="flex items-center gap-2">
              {showPaymentButtons && (
                <>
                  <Button
                    asChild
                    variant="secondary"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <a
                      href="http://paypal.me/federicolucero510"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Pay
                    </a>
                  </Button>
                  <NotifyOrganizerDialog
                    displayDate={matchTitle}
                    userName={user.name}
                  />
                </>
              )}
              {showAdminButtons && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkAsPaid(player.Email, player.Name)}
                  disabled={signupMutation.isPending}
                >
                  Mark as Paid
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [user, signupMutation.isPending, matchTitle],
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

  const totalSpots = 10;
  const paidPlayersCount = players.filter(
    (p) => p.Status === PLAYER_STATUSES[0],
  ).length;
  const spotsLeft = totalSpots - paidPlayersCount;

  if (isMatchLoading || isSessionPending) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading...</div>
    );
  }
  if (matchError) {
    return (
      <div className="py-8 text-center text-destructive">
        {matchError.message}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <MatchHeader
        matchTitle={matchTitle}
        onAddToCalendar={handleAddToCalendar}
        isShareDrawerOpen={isShareDrawerOpen}
        onShareDrawerOpenChange={setIsShareDrawerOpen}
        onShareWhatsApp={handleShareWhatsApp}
        onCopyLink={handleCopyLink}
        copyButtonText={copyButtonText}
      />
      <MatchStats
        paidPlayersCount={paidPlayersCount}
        totalPlayersCount={players.length}
        cost={matchMeta?.costCourt}
        courtNumber={matchMeta?.courtNumber}
      />
      <PlayersTable
        table={table}
        columnsCount={columns.length}
        isPending={signupMutation.isPending}
      />
      <MatchActions
        user={user}
        isPlayerInMatch={isPlayerInMatch}
        isCancelled={isCancelled}
        spotsLeft={spotsLeft}
        isSigningUp={signupMutation.isPending}
        onJoin={handleJoin}
        onCancel={handleCancel}
        onAddGuest={() => setIsGuestDialogOpen(true)}
      />
      <div className="mt-4 flex justify-center">
        <Button variant="outline" onClick={() => router.push("/rules")}>
          View Rules
        </Button>
      </div>
      <GuestSignupDialog
        open={isGuestDialogOpen}
        onOpenChange={setIsGuestDialogOpen}
        onAddGuest={handleAddGuest}
        isSubmitting={signupMutation.isPending}
        playerCount={players.length}
      />
    </div>
  );
}
