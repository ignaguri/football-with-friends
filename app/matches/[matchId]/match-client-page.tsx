"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";

import type { PlayerDisplay } from "@/lib/mappers/display-mappers";
import type { MatchStatus, PlayerStatus } from "@/lib/types";
import type { ColumnDef, SortingState } from "@tanstack/react-table";

import { GuestSignupDialog } from "./components/guest-signup-dialog";
import { MatchActions } from "./components/match-actions";
import { MatchHeader } from "./components/match-header";
import { MatchStats } from "./components/match-stats";
import { NotifyOrganizerDialog } from "./components/notify-organizer-dialog";
import { PlayersTable } from "./components/players-table";
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
import { captureException } from "@/lib/utils/sentry";

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
    const player = players.find((p) => p.email === user.email);
    return player ? player.status !== "CANCELLED" : false;
  }, [players, user]);

  const isCancelled = useMemo(() => {
    if (!user) return false;
    const player = players.find((p) => p.email === user.email);
    return player?.status === "CANCELLED";
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
          // Log signup errors to Sentry
          captureException(error, {
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

          // Error logged to Sentry above
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

  const handleUpdatePlayerStatus = useCallback(
    (
      playerEmail: string,
      playerName: string,
      newStatus: string,
      successMessage: string,
    ) => {
      // Validate input
      if (!playerEmail || !playerName) {
        toast.error(t("shared.errorOccurred"));
        return;
      }

      // Find the player's signup ID
      const player = players.find((p) => p.email === playerEmail);
      if (!player?.id) {
        toast.error(t("shared.errorOccurred"));
        return;
      }

      updateSignupMutation.mutate(
        {
          matchId,
          signupId: player.id,
          status: newStatus,
        },
        {
          onSuccess: () => {
            toast.success(successMessage);
          },
          onError: (error) => {
            toast.error(error.message || t("shared.errorOccurred"));
          },
        },
      );
    },
    [matchId, players, updateSignupMutation, t],
  );

  const handleMarkAsPaid = useCallback(
    (playerEmail: string, playerName: string) => {
      handleUpdatePlayerStatus(
        playerEmail,
        playerName,
        PLAYER_STATUSES[0],
        t("matchDetail.markPaidSuccess"),
      );
    },
    [handleUpdatePlayerStatus, t],
  );

  const handleUnmarkAsPaid = useCallback(
    (playerEmail: string, playerName: string) => {
      handleUpdatePlayerStatus(
        playerEmail,
        playerName,
        PLAYER_STATUSES[1],
        t("matchDetail.unmarkPaidSuccess"),
      );
    },
    [handleUpdatePlayerStatus, t],
  );

  function handleCancel() {
    if (!user) return;

    // Find the current user's signup
    const player = players.find((p) => p.email === user.email);
    if (!player?.id) {
      toast.error(t("shared.errorOccurred"));
      return;
    }

    updateSignupMutation.mutate(
      {
        matchId,
        signupId: player.id,
        status: "CANCELLED",
      },
      {
        onSuccess: () => {
          toast.success(t("matchDetail.cancelSuccess"));
        },
        onError: (error) => {
          toast.error(error.message || t("shared.errorOccurred"));
        },
      },
    );
  }

  const handleRejoin = useCallback(
    (playerEmail: string, playerName: string) => {
      handleUpdatePlayerStatus(
        playerEmail,
        playerName,
        PLAYER_STATUSES[1],
        t("matchDetail.rejoinSuccess"),
      );
    },
    [handleUpdatePlayerStatus, t],
  );

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
    if (status === "PENDING") return "warning";
    if (status === "CANCELLED") return "destructive";
    return "secondary";
  }

  const columns: ColumnDef<PlayerDisplay>[] = useMemo(() => {
    const statusLabelMap = {
      PAID: t("status.paid"),
      PENDING: t("status.notConfirmed"),
      CANCELLED: t("status.cancelled"),
    };

    return [
      {
        accessorKey: "name",
        header: t("shared.name"),
      },
      {
        accessorKey: "status",
        header: t("shared.status"),
        cell: ({ row }) => {
          const player = row.original;
          const status = player.status?.toUpperCase();
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
          const status = (player.status as PlayerStatus)?.toUpperCase();
          const isCurrentUser = user?.email === player.email;

          const showPaymentButtons =
            isCurrentUser && user && status === "PENDING";
          const showAdminButtons = user?.role === "admin";
          const showRejoinButton =
            (isCurrentUser || showAdminButtons) && status === "CANCELLED";

          // Show nothing for empty rows
          if (!status) {
            return null;
          }

          return (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Payment buttons for current user with PENDING status */}
              {showPaymentButtons && (
                <>
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <a
                      href={process.env.NEXT_PUBLIC_PAYPAL_URL}
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

              {/* Admin buttons */}
              {showAdminButtons && (
                <>
                  {status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleMarkAsPaid(player.email, player.name)
                      }
                      disabled={updateSignupMutation.isPending}
                    >
                      {t("matchDetail.markPaid")}
                    </Button>
                  )}
                  {status === "PAID" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleUnmarkAsPaid(player.email, player.name)
                      }
                      disabled={updateSignupMutation.isPending}
                    >
                      {t("matchDetail.unmarkPaid")}
                    </Button>
                  )}
                </>
              )}

              {/* Rejoin button for cancelled players */}
              {showRejoinButton && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRejoin(player.email, player.name)}
                  disabled={updateSignupMutation.isPending}
                >
                  {t("matchDetail.rejoin")}
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [
    user,
    updateSignupMutation.isPending,
    matchTitle,
    t,
    handleMarkAsPaid,
    handleUnmarkAsPaid,
    handleRejoin,
  ]);

  const table = useReactTable({
    data: players,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  const totalSpots = matchData?.matchDetails?.maxPlayers || 10;
  const paidPlayersCount = players.filter(
    (p) => p.status === PLAYER_STATUSES[0],
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
        location={matchData?.matchDetails?.location?.address}
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
        matchStatus={matchMeta?.status as MatchStatus}
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
