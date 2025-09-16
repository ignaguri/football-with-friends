"use client";

import { EditMatchForm } from "@/app/organizer/edit-match-form";
import { PlayerDrawer } from "@/app/organizer/player-drawer";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCrudOperations } from "@/hooks/use-crud-operations";
import {
  useGetMatches,
  useDeleteMatch,
  useUpdateMatch,
} from "@/hooks/use-matches";
import { useSession } from "@/lib/auth-client";
import { formatDisplayDate } from "@/lib/utils/timezone";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useState } from "react";

import type { MatchDisplay } from "@/lib/mappers/display-mappers";

import { ManagementTable } from "./management-table-simple";

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
  const { mutate: deleteMatch, isPending: isDeleting } = useDeleteMatch();
  const { mutate: updateMatch, isPending: isUpdating } = useUpdateMatch();

  const matches = matchesData?.matches || [];

  const [playerDrawerMatchId, setPlayerDrawerMatchId] = useState<string | null>(
    null,
  );

  const { editingItem, startEdit, cancelEdit, handleDelete } =
    useCrudOperations<MatchDisplay & { id: string }>({
      createItem: async () => {
        throw new Error("Create not implemented for matches");
      },
      updateItem: async () => {
        throw new Error("Update not implemented for matches");
      },
      deleteItem: (id: string) =>
        new Promise((resolve, reject) => {
          deleteMatch(id, {
            onSuccess: () => resolve(),
            onError: reject,
          });
        }),
      successMessages: {
        delete: t("organizer.deleteSuccess"),
      },
    });

  function handleEditSave(updated: MatchDisplay) {
    // Convert MatchDisplay to UpdateMatchData format
    const updates = {
      locationId: updated.locationId,
      courtId: updated.courtId,
      date: updated.date,
      time: updated.time,
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

  const actions = [
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
      disabled: () => isDeleting || isUpdating,
    },
    {
      label: t("organizer.delete"),
      variant: "destructive" as const,
      onClick: (match: MatchDisplay & { id: string }) => handleDelete(match),
      disabled: () => isDeleting || isUpdating,
    },
    {
      label: t("organizer.viewPlayers"),
      variant: "outline" as const,
      onClick: (match: MatchDisplay & { id: string }) =>
        setPlayerDrawerMatchId(match.matchId),
      disabled: () => isDeleting || isUpdating,
    },
  ];

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
    <div className={className}>
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white shadow dark:bg-gray-900">
        <ManagementTable
          items={matches.map((match) => ({ ...match, id: match.matchId }))}
          columns={columns}
          actions={actions}
          emptyMessage={t("organizer.noMatches")}
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
            <SheetDescription>{t("organizer.editMatchDesc")}</SheetDescription>
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
    </div>
  );
}
