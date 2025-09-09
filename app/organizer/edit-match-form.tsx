import { MatchForm, type MatchFormValues } from "@/components/forms/match-form";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import React from "react";

import type { MatchDisplay } from "@/lib/mappers/display-mappers";

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
    // Convert back to MatchDisplay format
    const updatedMatch: MatchDisplay = {
      ...match,
      date: format(values.date, "yyyy-MM-dd"),
      time: values.time,
      courtNumber: values.locationId,
      costCourt: values.costPerPlayer || "",
      costShirts: values.costShirts || "",
    };
    onSave(updatedMatch);
  }

  return (
    <div className="p-4">
      <MatchForm
        defaultValues={{
          date: new Date(match.date),
          time: match.time,
          locationId: match.courtNumber || "",
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
