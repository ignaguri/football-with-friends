"use client";

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
import {
  useGetMatches,
  useDeleteMatch,
  useUpdateMatch,
} from "@/hooks/use-matches";
import { useSession } from "@/lib/auth-client";
import { parse, format as formatDate } from "date-fns";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import type { MatchDisplay } from "@/lib/mappers/display-mappers";

import { EditMatchForm } from "./edit-match-form";
import { PlayerDrawer } from "./player-drawer";

export default function OrganizerDashboard() {
  const t = useTranslations();
  const { data: session, isPending } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const {
    data: matchesData,
    isLoading: isLoadingMatches,
    error: matchesError,
  } = useGetMatches();
  const { mutate: deleteMatch, isPending: isDeleting } = useDeleteMatch();
  const { mutate: updateMatch, isPending: isUpdating } = useUpdateMatch();

  const matches = matchesData?.matches || [];

  const [editingMatch, setEditingMatch] = useState<MatchDisplay | null>(null);
  const [playerDrawerMatchId, setPlayerDrawerMatchId] = useState<string | null>(
    null,
  );

  const _handleDelete = (matchId: string) => {
    deleteMatch(matchId, {
      onSuccess: () => {
        toast.success(t("organizer.deleteSuccess"));
      },
      onError: (e: unknown) => {
        toast.error(
          e instanceof Error ? e.message : t("organizer.deleteError"),
        );
      },
    });
  };

  function handleEditClick(match: MatchDisplay) {
    setEditingMatch(match);
  }

  function handleEditCancel() {
    setEditingMatch(null);
  }

  function handleEditSave(updated: MatchDisplay) {
    updateMatch(
      { matchId: updated.matchId, updates: updated },
      {
        onSuccess: () => {
          toast.success(t("organizer.updateSuccess"));
          setEditingMatch(null);
        },
        onError: (e: unknown) => {
          toast.error(
            e instanceof Error ? e.message : t("organizer.updateError"),
          );
        },
      },
    );
  }

  return (
    <main className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">{t("organizer.title")}</h1>
        <p className="text-gray-600">{t("organizer.description")}</p>
        {isPending || isLoadingMatches ? (
          <div className="mt-4 overflow-x-auto rounded-lg border bg-white shadow dark:bg-gray-900">
            <Table>
              <TableHeader>
                <TableRow>
                  {[...Array(7)].map((_, i) => (
                    <TableHead key={i}>
                      <Skeleton className="h-6 w-20" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : !isAdmin ? (
          <div className="p-8 text-center">
            <p className="text-red-600">{t("organizer.unauthorized")}</p>
          </div>
        ) : matchesError ? (
          <div className="p-8 text-center">
            <p className="text-red-600">
              {t("organizer.error", { message: matchesError.message })}
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border bg-white shadow dark:bg-gray-900">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("shared.date")}</TableHead>
                  <TableHead>{t("shared.time")}</TableHead>
                  <TableHead>{t("organizer.table.court")}</TableHead>
                  <TableHead>{t("shared.status")}</TableHead>
                  <TableHead>{t("organizer.table.costCourt")}</TableHead>
                  <TableHead>{t("organizer.table.costShirts")}</TableHead>
                  <TableHead>{t("shared.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((m) => (
                  <TableRow key={m.matchId}>
                    <TableCell>
                      {m.date
                        ? formatDate(
                            parse(m.date, "yyyy-MM-dd", new Date()),
                            "dd MMM yyyy",
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>{m.time}</TableCell>
                    <TableCell>{m.courtNumber}</TableCell>
                    <TableCell>{m.status}</TableCell>
                    <TableCell>{m.costCourt}</TableCell>
                    <TableCell>{m.costShirts}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditClick(m)}
                        disabled={isDeleting || isUpdating}
                      >
                        {t("organizer.edit")}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isDeleting || isUpdating}
                          >
                            {t("organizer.delete")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("organizer.deleteTitle")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("organizer.deleteDesc")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              {t("shared.cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => _handleDelete(m.matchId)}
                              disabled={isDeleting}
                            >
                              {isDeleting
                                ? t("organizer.deleting")
                                : t("organizer.deleteConfirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPlayerDrawerMatchId(m.matchId)}
                        disabled={isDeleting || isUpdating}
                      >
                        View Players
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <Drawer
        open={!!editingMatch}
        onOpenChange={(open) => {
          if (!open) handleEditCancel();
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Match</DrawerTitle>
            <DrawerDescription>
              Update the match details below and save your changes.
            </DrawerDescription>
          </DrawerHeader>
          {editingMatch && (
            <EditMatchForm
              match={editingMatch}
              onSave={handleEditSave}
              onCancel={handleEditCancel}
              isSaving={isUpdating}
            />
          )}
        </DrawerContent>
      </Drawer>
      <PlayerDrawer
        matchId={playerDrawerMatchId}
        isOpen={!!playerDrawerMatchId}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPlayerDrawerMatchId(null);
        }}
      />
    </main>
  );
}
