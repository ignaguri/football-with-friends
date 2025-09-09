"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetMatch, useSignupPlayer } from "@/hooks/use-matches";
import { useSession } from "@/lib/auth-client";
import { PLAYER_STATUSES } from "@/lib/types";
import { formatMatchTitle } from "@/lib/utils";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
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

interface Player {
  [key: string]: string;
}

export default function MatchClientPage() {
  const { matchId: rawMatchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const user = session?.user;
  const t = useTranslations();
  const locale = useLocale();

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
    formatMatchTitle(matchMeta?.date, matchMeta?.time, locale) || matchId;
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

  const statusLabelMap = {
    PAID: t("status.paid"),
    PENDING: t("status.pending"),
    CANCELLED: t("status.cancelled"),
  };

  const handleSignup = (
    payload: {
      playerName?: string;
      playerEmail?: string;
      status: string;
      isGuest?: boolean;
      ownerName?: string;
      ownerEmail?: string;
      guestName?: string;
    },
    successMessage: string,
  ) => {
    signupMutation.mutate(
      { matchId, payload },
      {
        onSuccess: () => {
          toast.success(successMessage);
        },
        onError: (error) => {
          toast.error(error.message || t("shared.errorOccurred"));
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
      t("matchDetail.signupSuccess"),
    );
  }

  function handleMarkAsPaid(playerEmail: string, playerName: string) {
    handleSignup(
      {
        playerName,
        playerEmail,
        status: PLAYER_STATUSES[0], // PAID
      },
      t("matchDetail.markPaidSuccess"),
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
      t("matchDetail.cancelSuccess"),
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
      t("matchDetail.guestAddSuccess"),
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
        header: t("shared.name"),
      },
      {
        accessorKey: "Status",
        header: t("shared.status"),
        cell: ({ row }) => {
          const player = row.original;
          const status = player.Status?.toUpperCase();
          return (
            <Badge variant={getBadgeVariant(status as PlayerStatus)}>
              {statusLabelMap[status as PlayerStatus] || status}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: t("shared.actions"),
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
                      {t("matchDetail.pay")}
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
                  {t("matchDetail.markPaid")}
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [user, signupMutation.isPending, matchTitle, t, handleMarkAsPaid],
  );

  const table = useReactTable({
    data: players,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  const totalSpots = 10;
  const paidPlayersCount = players.filter(
    (p) => p.Status === PLAYER_STATUSES[0],
  ).length;
  const spotsLeft = totalSpots - paidPlayersCount;

  if (isMatchLoading || isSessionPending) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {t("shared.loading")}
      </div>
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
        matchMeta={{
          date: matchMeta?.date || "",
          time: matchMeta?.time || "",
        }}
        matchUrl={matchUrl}
        isShareDrawerOpen={isShareDrawerOpen}
        onShareDrawerOpenChange={setIsShareDrawerOpen}
        shareText={shareText}
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
          {t("matchDetail.viewRules")}
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
