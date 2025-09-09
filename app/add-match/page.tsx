"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth-client";
import { isApiErrorKey } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

function AddMatchForm() {
  const t = useTranslations();
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";
  const [error, setError] = useState<string | null>(null);
  const addMatchSchema = z.object({
    date: z.date({ error: t("addMatch.dateRequired") }),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, t("addMatch.timeFormat"))
      .refine(
        (val) => {
          const [, minutes] = val.split(":");
          return minutes === "00" || minutes === "30";
        },
        { message: t("addMatch.timeIncrement") },
      ),
    locationId: z.string().optional(),
    costPerPlayer: z.string().optional(),
  });
  type AddMatchFormValues = z.infer<typeof addMatchSchema>;
  const {
    handleSubmit,
    control,
    formState: { isSubmitting, errors },
  } = useForm<AddMatchFormValues>({
    resolver: zodResolver(addMatchSchema),
    defaultValues: {
      date: undefined,
      time: "",
      locationId: "",
      costPerPlayer: "",
    },
  });
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
    costPerPlayer,
  }: AddMatchFormValues) {
    setError(null);
    try {
      // Format date as YYYY-MM-DD
      const formattedDate = date.toISOString().slice(0, 10); // YYYY-MM-DD
      const payload: Record<string, string> = {
        date: formattedDate,
        time,
      };
      if (locationId) payload.locationId = locationId;
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
      const matchId = data.match?.matchId;
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-4 flex min-h-[80dvh] w-full max-w-sm flex-col gap-6 overflow-y-auto rounded-lg border bg-background p-4 shadow-md sm:p-6"
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">{t("shared.date")}</label>
        <Controller
          name="date"
          control={control}
          render={({ field }) => (
            <>
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                hidden={{ before: new Date() }}
                className="w-full"
              />
              {errors.date && (
                <div className="mt-1 text-sm text-destructive">
                  {t("addMatch.dateRequired")}
                </div>
              )}
            </>
          )}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="match-time">
          {t("shared.time")}
        </label>
        <Controller
          name="time"
          control={control}
          render={({ field }) => (
            <>
              <Input
                {...field}
                id="match-time"
                type="time"
                step="1800"
                placeholder="HH:mm"
                required
                disabled={isSubmitting}
              />
              {errors.time && (
                <div className="mt-1 text-sm text-destructive">
                  {errors.time.message === "Time must be in HH:mm format."
                    ? t("addMatch.timeFormat")
                    : t("addMatch.timeIncrement")}
                </div>
              )}
            </>
          )}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="court-number">
          {t("addMatch.courtNumber")}
        </label>
        <Controller
          name="locationId"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="court-number"
              type="text"
              placeholder={t("addMatch.courtPlaceholder")}
              disabled={isSubmitting}
            />
          )}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="cost-court">
          {t("addMatch.costCourt")}
        </label>
        <Controller
          name="costPerPlayer"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="cost-court"
              type="number"
              placeholder={t("addMatch.costPlaceholder")}
              disabled={isSubmitting}
            />
          )}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || redirecting}
      >
        {isSubmitting || redirecting ? t("addMatch.adding") : t("addMatch.add")}
      </Button>
      {redirecting && (
        <div className="mt-2 text-center text-sm text-muted-foreground">
          {t("addMatch.redirecting")}
        </div>
      )}
      {error && (
        <div className="text-center text-sm text-destructive">{error}</div>
      )}
    </form>
  );
}

export default function AddMatchPage() {
  return (
    <div className="flex min-h-[75dvh] items-center justify-center px-4">
      <AddMatchForm />
    </div>
  );
}
