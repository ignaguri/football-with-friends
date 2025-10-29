import { format } from "date-fns";
import { useTranslations } from "next-intl";
import React from "react";

import type { MatchDisplay } from "@/lib/mappers/display-mappers";

import { MatchForm, type MatchFormValues } from "@/components/forms/match-form";
import {
  convertFromAppTimezone,
  convertToAppTimezone,
} from "@/lib/utils/timezone";

type EditMatchFormProps = {
  match: MatchDisplay;
  onSave: (match: MatchDisplay) => void;
  onCancel: () => void;
  isSaving?: boolean;
};

export function EditMatchForm({
  match,
  onSave,
  onCancel,
  isSaving,
}: EditMatchFormProps) {
  const t = useTranslations();

  function onSubmit(values: MatchFormValues) {
    // Convert date to Berlin timezone and format as YYYY-MM-DD
    const berlinDate = convertToAppTimezone(values.date);
    const updatedMatch: MatchDisplay = {
      ...match,
      date: format(berlinDate, "yyyy-MM-dd"),
      time: values.time,
      locationId: values.locationId,
      courtId: values.courtId === "none" ? undefined : values.courtId,
      maxPlayers: values.maxPlayers,
      costCourt: values.costPerPlayer || "",
      costShirts: values.costShirts || "",
    };
    onSave(updatedMatch);
  }

  return (
    <div className="p-2 sm:p-4">
      <MatchForm
        defaultValues={{
          date: convertFromAppTimezone(match.date),
          time: match.time,
          locationId: match.locationId || "",
          courtId: match.courtId || "none",
          maxPlayers: match.maxPlayers || 10,
          costPerPlayer: match.costCourt || "",
          costShirts: match.costShirts || "",
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isSubmitting={isSaving}
        submitText={t("addMatch.save")}
        submitLoadingText={t("addMatch.adding")}
        showCancelButton={true}
        cancelText={t("shared.cancel")}
      />
    </div>
  );
}
