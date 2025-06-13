"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth-client";

const addMatchSchema = z.object({
  date: z.date({ required_error: "Please select a date." }),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format.")
    .refine(
      (val) => {
        const [, minutes] = val.split(":");
        return minutes === "00" || minutes === "30";
      },
      { message: "Time must be in 30-minute increments (e.g. 18:00, 18:30)" },
    ),
  courtNumber: z.string().optional(),
});
type AddMatchFormValues = z.infer<typeof addMatchSchema>;

function AddMatchForm() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";
  const [error, setError] = useState<string | null>(null);
  const {
    handleSubmit,
    control,
    formState: { isSubmitting, errors },
  } = useForm<AddMatchFormValues>({
    resolver: zodResolver(addMatchSchema),
    defaultValues: { date: undefined, time: "" },
  });
  const [redirecting, setRedirecting] = useState(false);

  if (isPending) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading...</div>
    );
  }
  if (!user) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        You must be signed in.
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        You are not authorized to add matches.
      </div>
    );
  }

  async function onSubmit({ date, time, courtNumber }: AddMatchFormValues) {
    setError(null);
    try {
      // Format date as DD-MM-YYYY
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;
      const payload: Record<string, string> = {
        date: formattedDate,
        time,
      };
      if (courtNumber) payload.courtNumber = courtNumber;
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create match");
      }
      const data = await res.json();
      const matchId = data.match?.matchId;
      if (!matchId) throw new Error("No matchId returned");
      toast.success("Match created! Redirecting you to the match page...");
      setRedirecting(true);
      // Wait a moment for the toast to show
      setTimeout(() => {
        router.push(`/matches/${encodeURIComponent(matchId)}`);
      }, 800);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-sm flex-col gap-6 rounded-lg border bg-background p-6 shadow-md"
    >
      <label className="text-sm font-medium">Match Date</label>
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
                {errors.date.message as string}
              </div>
            )}
          </>
        )}
      />
      <label className="text-sm font-medium" htmlFor="match-time">
        Match Time
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
                {errors.time.message as string}
              </div>
            )}
          </>
        )}
      />
      <label className="text-sm font-medium" htmlFor="court-number">
        Court Number (optional)
      </label>
      <Controller
        name="courtNumber"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="court-number"
            type="text"
            placeholder="Court #"
            disabled={isSubmitting}
          />
        )}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || redirecting}
      >
        {isSubmitting || redirecting ? "Adding..." : "+ Add Match"}
      </Button>
      {redirecting && (
        <div className="mt-2 text-center text-sm text-muted-foreground">
          Match created! Redirecting...
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
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <AddMatchForm />
    </div>
  );
}
