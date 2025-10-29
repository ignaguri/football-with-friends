"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { MatchForm, type MatchFormValues } from "@/components/forms/match-form";
import { useSession } from "@/lib/auth-client";
import { isApiErrorKey } from "@/lib/types";
import { convertToAppTimezone } from "@/lib/utils/timezone";

function AddMatchForm() {
  const t = useTranslations();
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";
  const [error, setError] = useState<string | null>(null);

  const [redirecting, setRedirecting] = useState(false);

  if (isPending) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {t("shared.loading")}
      </div>
    );
  }
  if (!user) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {t("addMatch.mustSignIn")}
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {t("addMatch.unauthorized")}
      </div>
    );
  }

  async function onSubmit({
    date,
    time,
    locationId,
    courtId,
    costPerPlayer,
  }: MatchFormValues) {
    setError(null);
    try {
      // Convert date to Berlin timezone and format as YYYY-MM-DD
      const berlinDate = convertToAppTimezone(date);
      const formattedDate = format(berlinDate, "yyyy-MM-dd");
      const payload: Record<string, string> = {
        date: formattedDate,
        time,
      };
      if (locationId) payload.locationId = locationId;
      if (courtId) payload.courtId = courtId;
      if (costPerPlayer) payload.costPerPlayer = costPerPlayer;
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let errorMsg = t("addMatch.error");
        try {
          const data = await res.json();
          if (data?.error && typeof data.error === "string") {
            if (isApiErrorKey(data.error)) {
              errorMsg = tErrors(data.error);
            } else {
              errorMsg = data.error;
            }
          }
        } catch {
          // fallback to text
          const text = await res.text();
          if (text) errorMsg = text;
        }
        throw new Error(errorMsg);
      }
      const data = await res.json();
      const matchId = data.match?.id;
      if (!matchId) {
        throw new Error(t("errors.noMatchId"));
      }
      toast.success(t("addMatch.created"));
      setRedirecting(true);
      // Wait a moment for the toast to show
      setTimeout(() => {
        router.push(`/matches/${encodeURIComponent(matchId)}`);
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errors.unknownError"));
    }
  }

  return (
    <div className="mt-4 flex min-h-[80dvh] w-full max-w-sm flex-col gap-6 overflow-y-auto rounded-lg border bg-background p-4 shadow-md sm:p-6">
      <h1 className="text-2xl font-bold text-center">{t("addMatch.title")}</h1>
      <MatchForm
        onSubmit={onSubmit}
        isSubmitting={redirecting}
        submitText={t("addMatch.add")}
        submitLoadingText={t("addMatch.adding")}
        className="flex-1"
      />
      {redirecting && (
        <div className="mt-2 text-center text-sm text-muted-foreground">
          {t("addMatch.redirecting")}
        </div>
      )}
      {error && (
        <div className="text-center text-sm text-destructive">{error}</div>
      )}
    </div>
  );
}

export default function AddMatchPage() {
  return (
    <div className="flex min-h-[75dvh] items-center justify-center px-4">
      <AddMatchForm />
    </div>
  );
}
