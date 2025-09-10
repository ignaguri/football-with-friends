"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useGetMatch,
  useSignupPlayer,
  useUpdateSignup,
} from "@/hooks/use-matches";
import { useSession } from "@/lib/auth-client";
import { PLAYER_STATUSES } from "@/lib/types";
import { formatMatchTitle } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { PlayerDisplay } from "@/lib/mappers/display-mappers";
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
  const updateSignupMutation = useUpdateSignup();

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

          // Log successful signup to Sentry
          Sentry.captureMessage("Signup successful", "info", {
            extra: {
              matchId,
              isGuest: payload.isGuest,
              guestName: payload.guestName,
              playerEmail: payload.playerEmail,
              playerName: payload.playerName,
            },
          });
        },
        onError: (error) => {
          // Log signup errors to Sentry
          Sentry.captureException(error, {
            tags: {
              operation: "client_signup",
              matchId,
            },
            extra: {
              isGuest: payload.isGuest,
              guestName: payload.guestName,
              playerEmail: payload.playerEmail,
              playerName: payload.playerName,
              errorMessage: error.message,
            },
          });

          console.error("Signup error:", error);
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
    // Validate input
    if (!playerEmail || !playerName) {
      toast.error(t("shared.errorOccurred"));
      return;
    }

    // Find the player's signup ID
    const player = players.find((p) => p.Email === playerEmail);
    if (!player?.Id) {
      console.error("Player not found for email:", playerEmail);
      toast.error(t("shared.errorOccurred"));
      return;
    }

    updateSignupMutation.mutate(
      {
        matchId,
        signupId: player.Id,
        status: PLAYER_STATUSES[0], // PAID
      },
      {
        onSuccess: () => {
          toast.success(t("matchDetail.markPaidSuccess"));
        },
        onError: (error) => {
          console.error("Error updating signup:", error);
          toast.error(error.message || t("shared.errorOccurred"));
        },
      },
    );
  }

  function handleCancel() {
    if (!user) return;

    // Find the current user's signup
    const player = players.find((p) => p.Email === user.email);
    if (!player?.Id) {
      console.error("User signup not found for email:", user.email);
      toast.error(t("shared.errorOccurred"));
      return;
    }

    updateSignupMutation.mutate(
      {
        matchId,
        signupId: player.Id,
        status: "CANCELLED",
      },
      {
        onSuccess: () => {
          toast.success(t("matchDetail.cancelSuccess"));
        },
        onError: (error) => {
          console.error("Error canceling signup:", error);
          toast.error(error.message || t("shared.errorOccurred"));
        },
      },
    );
  }

  function handleAddGuest(guestName?: string) {
    if (!user) return;

    // Add Sentry logging for guest invitation attempts
    console.log("Attempting to add guest:", {
      matchId,
      guestName,
      ownerEmail: user.email,
      ownerName: user.name,
      isPlayerInMatch,
    });

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

  const columns: ColumnDef<PlayerDisplay>[] = useMemo(
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
                  disabled={updateSignupMutation.isPending}
                >
                  {t("matchDetail.markPaid")}
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [
      user,
      signupMutation.isPending,
      updateSignupMutation.isPending,
      matchTitle,
      t,
      handleMarkAsPaid,
    ],
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
        isPending={signupMutation.isPending || updateSignupMutation.isPending}
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
