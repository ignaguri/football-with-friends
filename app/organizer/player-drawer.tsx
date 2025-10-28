"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
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
import { useGetMatch, useUpdateSignup } from "@/hooks/use-matches";
import { useSession } from "@/lib/auth-client";
import { capitalize, formatMatchTitle } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { PlayerDisplay } from "@/lib/mappers/display-mappers";

interface PlayerDrawerProps {
  matchId: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

function getBadgeVariant(status: string) {
  if (status === "PAID") return "success";
  if (status === "PENDING") return "default";
  if (status === "CANCELLED") return "destructive";
  return "secondary";
}

export function PlayerDrawer({
  matchId,
  isOpen,
  onOpenChange,
}: PlayerDrawerProps) {
  const t = useTranslations();
  const { data: matchData, isLoading, isError, error } = useGetMatch(matchId!);
  const { data: session } = useSession();
  const currentUser = session?.user;

  const { mutate: cancelPlayer, isPending: isCancelling } = useUpdateSignup();

  const players = matchData?.players || [];
  const matchTitle =
    formatMatchTitle(matchData?.meta?.date, matchData?.meta?.time) ||
    matchData?.meta?.sheetName ||
    "";

  function handleCancelPlayer(player: PlayerDisplay) {
    if (!matchId || !player.id) {
      Sentry.captureException(new Error("Missing matchId or player ID"), {
        extra: {
          matchId,
          playerId: player.id,
          playerEmail: player.email,
        },
      });
      toast.error(t("playerDrawer.cancelError"));
      return;
    }

    cancelPlayer(
      {
        matchId,
        signupId: player.id,
        status: "CANCELLED",
      },
      {
        onSuccess: () => {
          toast.success(t("playerDrawer.cancelSuccess", { name: player.name }));
        },
        onError: (e: unknown) => {
          Sentry.captureException(e, {
            extra: {
              matchId,
              playerId: player.id,
              playerEmail: player.email,
              playerName: player.name,
            },
          });
          toast.error(
            e instanceof Error ? e.message : t("playerDrawer.cancelError"),
          );
        },
      },
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {t("playerDrawer.title", { title: capitalize(matchTitle) })}
          </DrawerTitle>
          <DrawerDescription>{t("playerDrawer.description")}</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : isError ? (
            <div className="text-destructive">
              {t("playerDrawer.error", { message: error?.message })}
            </div>
          ) : players.length === 0 ? (
            <div className="text-muted-foreground">
              {t("playerDrawer.noPlayers")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("shared.name")}</TableHead>
                  <TableHead>{t("playerDrawer.email")}</TableHead>
                  <TableHead>{t("shared.status")}</TableHead>
                  <TableHead>{t("shared.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => (
                  <TableRow key={player.email}>
                    <TableCell>{player.name}</TableCell>
                    <TableCell>{player.email}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(player.status)}>
                        {player.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {player.status !== "CANCELLED" && currentUser && (
                        <div className="flex items-center gap-2">
                          {/* Admin can cancel anyone */}
                          {currentUser.role === "admin" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isCancelling}
                              onClick={() => handleCancelPlayer(player)}
                            >
                              {isCancelling
                                ? t("playerDrawer.cancelling")
                                : t("playerDrawer.cancelSpot")}
                            </Button>
                          )}
                          {/* Guest owner can cancel their guests */}
                          {currentUser.role !== "admin" &&
                            player.isGuest &&
                            player.ownerEmail === currentUser.email && (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isCancelling}
                                onClick={() => handleCancelPlayer(player)}
                              >
                                {isCancelling
                                  ? t("playerDrawer.cancelling")
                                  : t("playerDrawer.cancelGuest")}
                              </Button>
                            )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
