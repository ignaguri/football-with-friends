"use client";

import { ExternalLink, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

import type { MatchDisplay } from "@/lib/mappers/display-mappers";

import { ManagementTable } from "./management-table-simple";
import { EditMatchForm } from "@/app/organizer/edit-match-form";
import { PlayerDrawer } from "@/app/organizer/player-drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCrudOperations } from "@/hooks/use-crud-operations";
import {
  useGetMatches,
  useDeleteMatch,
  useUpdateMatch,
} from "@/hooks/use-matches";
import { useSession } from "@/lib/auth-client";
import { formatDisplayDate } from "@/lib/utils/timezone";

interface MatchManagementProps {
  className?: string;
}

export function MatchManagement({ className }: MatchManagementProps) {
  const t = useTranslations();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const {
    data: matchesData,
    isLoading: isLoadingMatches,
    error: matchesError,
  } = useGetMatches();
  const { mutateAsync: deleteMatchMutation, isPending: isDeleting } =
    useDeleteMatch();
  const { mutate: updateMatch, isPending: isUpdating } = useUpdateMatch();

  const matches = matchesData?.matches || [];

  const [playerDrawerMatchId, setPlayerDrawerMatchId] = useState<string | null>(
    null,
  );
  const [cancelDialogMatch, setCancelDialogMatch] = useState<
    (MatchDisplay & { id: string }) | null
  >(null);
  const [cancellingMatchId, setCancellingMatchId] = useState<string | null>(
    null,
  );
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);

  const emptyStateComponent = (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="rounded-full bg-muted p-3">
        <Plus className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-sm font-medium">{t("organizer.noMatchesTitle")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("organizer.noMatchesDescription")}
        </p>
      </div>
      <Button asChild>
        <a href="/add-match">
          <Plus className="mr-2 h-4 w-4" />
          {t("organizer.createFirstMatch")}
        </a>
      </Button>
    </div>
  );

  const { editingItem, startEdit, cancelEdit } = useCrudOperations<
    MatchDisplay & { id: string }
  >({
    createItem: async () => {
      throw new Error("Create not implemented for matches");
    },
    updateItem: async () => {
      throw new Error("Update not implemented for matches");
    },
    deleteItem: async () => {
      throw new Error("Delete not implemented for matches");
    },
  });

  const handleDeleteMatch = (match: MatchDisplay & { id: string }) => {
    if (confirm(t("organizer.deleteMatchConfirm"))) {
      setDeletingMatchId(match.matchId);
      deleteMatchMutation(match.matchId, {
        onSettled: () => {
          setDeletingMatchId(null);
        },
      });
    }
  };

  function handleEditSave(updated: MatchDisplay) {
    // Convert MatchDisplay to UpdateMatchData format
    const updates = {
      locationId: updated.locationId,
      courtId: updated.courtId,
      date: updated.date,
      time: updated.time,
      maxPlayers: updated.maxPlayers,
      costPerPlayer: updated.costCourt || undefined,
      shirtCost: updated.costShirts || undefined,
    };

    updateMatch(
      { matchId: updated.matchId, updates },
      {
        onSuccess: () => {
          cancelEdit();
        },
        onError: (e: unknown) => {
          // Error handling is done by the mutation
        },
      },
    );
  }

  const columns = [
    {
      key: "date" as const,
      label: t("shared.date"),
      render: (match: MatchDisplay & { id: string }) =>
        match.date ? formatDisplayDate(match.date, "dd MMM yyyy") : "-",
    },
    {
      key: "time" as const,
      label: t("shared.time"),
    },
    {
      key: "locationName" as const,
      label: t("addMatch.court"),
      render: (match: MatchDisplay & { id: string }) => (
        <div className="flex flex-col">
          <span className="font-medium">{match.locationName}</span>
          {match.courtName && (
            <span className="text-sm text-muted-foreground">
              {match.courtName}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "maxPlayers" as const,
      label: t("addMatch.maxPlayers"),
    },
    {
      key: "status" as const,
      label: t("shared.status"),
    },
    {
      key: "costCourt" as const,
      label: t("addMatch.costCourt"),
    },
    {
      key: "costShirts" as const,
      label: t("editMatch.costShirts"),
    },
  ];

  const handleCancelMatch = (match: MatchDisplay & { id: string }) => {
    setCancellingMatchId(match.matchId);
    const updates = {
      status: "cancelled" as const,
    };

    updateMatch(
      { matchId: match.matchId, updates },
      {
        onSuccess: () => {
          toast.success(t("organizer.matchCancelledSuccess"));
          setCancellingMatchId(null);
        },
        onError: (e: unknown) => {
          setCancellingMatchId(null);
        },
      },
    );
  };

  const handleCancelDialogConfirm = () => {
    if (cancelDialogMatch) {
      handleCancelMatch(cancelDialogMatch);
      setCancelDialogMatch(null);
    }
  };

  const handleCancelDialogCancel = () => {
    setCancelDialogMatch(null);
  };

  const actions = useMemo(
    () => [
      {
        label: t("organizer.viewMatch"),
        variant: "outline" as const,
        onClick: (match: MatchDisplay & { id: string }) =>
          router.push(`/matches/${encodeURIComponent(match.matchId)}`),
        render: (match: MatchDisplay & { id: string }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/matches/${encodeURIComponent(match.matchId)}`)
            }
          >
            <ExternalLink className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:block">{t("organizer.viewMatch")}</span>
          </Button>
        ),
      },
      {
        label: t("organizer.edit"),
        variant: "secondary" as const,
        onClick: (match: MatchDisplay & { id: string }) => startEdit(match),
        disabled: (match: MatchDisplay & { id: string }) =>
          isDeleting ||
          isUpdating ||
          match.status === "cancelled" ||
          match.status === "completed",
        tooltip: (match: MatchDisplay & { id: string }) => {
          if (match.status === "cancelled")
            return t("organizer.cannotEditCancelled");
          if (match.status === "completed")
            return t("organizer.cannotEditCompleted");
          if (isDeleting || isUpdating)
            return t("organizer.cannotEditWhileProcessing");
          return null;
        },
      },
      {
        label: t("organizer.cancelMatch"),
        variant: "destructive" as const,
        onClick: (match: MatchDisplay & { id: string }) => {
          setCancelDialogMatch(match);
        },
        disabled: (match: MatchDisplay & { id: string }) =>
          cancellingMatchId === match.matchId || match.status === "cancelled",
        isLoading: (match: MatchDisplay & { id: string }) =>
          cancellingMatchId === match.matchId,
        tooltip: (match: MatchDisplay & { id: string }) => {
          if (match.status === "cancelled")
            return t("organizer.cannotCancelCancelled");
          if (cancellingMatchId === match.matchId)
            return t("organizer.cancellingMatch");
          return null;
        },
      },
      {
        label: t("organizer.delete"),
        variant: "destructive" as const,
        onClick: (match: MatchDisplay & { id: string }) =>
          handleDeleteMatch(match),
        disabled: (match: MatchDisplay & { id: string }) =>
          deletingMatchId === match.matchId,
        isLoading: (match: MatchDisplay & { id: string }) =>
          deletingMatchId === match.matchId,
      },
      {
        label: t("organizer.viewPlayers"),
        variant: "outline" as const,
        onClick: (match: MatchDisplay & { id: string }) =>
          setPlayerDrawerMatchId(match.matchId),
        disabled: () => isDeleting || isUpdating,
      },
    ],
    [
      t,
      isDeleting,
      isUpdating,
      startEdit,
      handleDeleteMatch,
      handleCancelMatch,
      setPlayerDrawerMatchId,
      router,
    ],
  );

  if (isPending || isLoadingMatches) {
    return (
      <div className={className}>
        <div className="mt-4 overflow-x-auto rounded-lg border bg-white shadow dark:bg-gray-900">
          <div className="p-4">
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={className}>
        <div className="p-8 text-center">
          <p className="text-red-600">{t("organizer.unauthorized")}</p>
        </div>
      </div>
    );
  }

  if (matchesError) {
    return (
      <div className={className}>
        <div className="p-8 text-center">
          <p className="text-red-600">
            {t("organizer.error", { message: matchesError.message })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={className}>
        <div className="mt-4 overflow-x-auto rounded-lg border bg-white shadow dark:bg-gray-900">
          <ManagementTable
            items={matches.map((match) => ({ ...match, id: match.matchId }))}
            columns={columns}
            actions={actions}
            emptyMessage={t("organizer.noMatches")}
            emptyStateComponent={emptyStateComponent}
          />
        </div>

        {/* Edit Match Sheet */}
        <Sheet
          open={!!editingItem}
          onOpenChange={(open) => {
            if (!open) cancelEdit();
          }}
        >
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
            <SheetHeader className="pb-4">
              <SheetTitle>{t("organizer.editMatch")}</SheetTitle>
              <SheetDescription>
                {t("organizer.editMatchDesc")}
              </SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto flex-1">
              {editingItem && (
                <EditMatchForm
                  match={editingItem}
                  onSave={handleEditSave}
                  onCancel={cancelEdit}
                  isSaving={isUpdating}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Player Drawer */}
        <PlayerDrawer
          matchId={playerDrawerMatchId}
          isOpen={!!playerDrawerMatchId}
          onOpenChange={(isOpen) => {
            if (!isOpen) setPlayerDrawerMatchId(null);
          }}
        />

        {/* Cancel Match Confirmation Dialog */}
        <AlertDialog
          open={!!cancelDialogMatch}
          onOpenChange={(open) => {
            if (!open) setCancelDialogMatch(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("organizer.cancelMatch")}</AlertDialogTitle>
              <AlertDialogDescription>
                {cancelDialogMatch
                  ? t("organizer.cancelMatchConfirm", {
                      date: cancelDialogMatch.date,
                      time: cancelDialogMatch.time,
                    })
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDialogCancel}>
                {t("shared.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelDialogConfirm}>
                {t("organizer.cancelMatch")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
