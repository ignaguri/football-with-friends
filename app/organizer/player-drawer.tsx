"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
import { useGetMatch, useSignupPlayer } from "@/hooks/use-matches";
import { capitalize, formatMatchTitle } from "@/lib/utils";

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

  const { mutate: cancelPlayer, isPending: isCancelling } = useSignupPlayer();

  const players = matchData?.players || [];
  const matchTitle =
    formatMatchTitle(matchData?.meta?.date, matchData?.meta?.time) ||
    matchData?.meta?.sheetName ||
    "";

  function handleCancelPlayer(player: Record<string, string>) {
    if (!matchId) return;
    cancelPlayer(
      {
        matchId,
        payload: {
          playerName: player.Name,
          playerEmail: player.Email,
          status: "CANCELLED",
        },
      },
      {
        onSuccess: () => {
          toast.success(t("playerDrawer.cancelSuccess", { name: player.Name }));
        },
        onError: (e: any) => {
          toast.error(e.message || t("playerDrawer.cancelError"));
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
                  <TableRow key={player.Email}>
                    <TableCell>{player.Name}</TableCell>
                    <TableCell>{player.Email}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(player.Status)}>
                        {player.Status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {player.Status !== "CANCELLED" ? (
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
                      ) : null}
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
