"use client";

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
          toast.success(`Cancelled ${player.Name}'s spot.`);
        },
        onError: (e: any) => {
          toast.error(e.message || "Could not cancel player's spot.");
        },
      },
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Players for {capitalize(matchTitle)}</DrawerTitle>
          <DrawerDescription>
            View and manage players signed up for this match.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : isError ? (
            <div className="text-destructive">
              Error loading players: {error?.message}
            </div>
          ) : players.length === 0 ? (
            <div className="text-muted-foreground">No players found.</div>
          ) : (
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
                          {isCancelling ? "Cancelling..." : "Cancel Spot"}
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
