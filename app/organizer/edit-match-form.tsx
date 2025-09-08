import { Button } from "@/components/ui/button";
import { DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { parse, format } from "date-fns";
import { useTranslations } from "next-intl";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { MatchMetadata } from "@/lib/types";

const matchSchema = z.object({
  matchId: z.string(),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  courtNumber: z.string(),
  status: z.string(),
  costCourt: z.string(),
  costShirts: z.string(),
  // Add other fields from MatchMetadata that are not in the form but need to be passed through
  sheetName: z.string(),
  sheetGid: z.string(),
});

type EditMatchFormProps = {
  match: MatchMetadata;
  onSave: (match: MatchMetadata) => void;
  onCancel: () => void;
  isSaving?: boolean;
};

// Helper functions to normalize date and time formats
function normalizeDate(date: string) {
  // Always return YYYY-MM-DD using date-fns
  try {
    const parsed = parse(date, "yyyy-MM-dd", new Date());
    if (!isNaN(parsed.getTime())) {
      return format(parsed, "yyyy-MM-dd");
    }
    // Try parsing as ISO or other formats
    const fallback = new Date(date);
    if (!isNaN(fallback.getTime())) {
      return format(fallback, "yyyy-MM-dd");
    }
  } catch {}
  return date;
}

function normalizeTime(time: string) {
  // Always return HH:mm using date-fns
  try {
    // Accepts 'H:mm' or 'HH:mm'
    const parsed = parse(time, "H:mm", new Date());
    if (!isNaN(parsed.getTime())) {
      return format(parsed, "HH:mm");
    }
    // Try parsing as ISO or other formats
    const fallback = new Date(`1970-01-01T${time}`);
    if (!isNaN(fallback.getTime())) {
      return format(fallback, "HH:mm");
    }
  } catch {}
  return time;
}

export function EditMatchForm({
  match,
  onSave,
  onCancel,
  isSaving,
}: EditMatchFormProps) {
  const t = useTranslations();
  const form = useForm<z.infer<typeof matchSchema>>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      ...match,
      date: normalizeDate(match.date),
      time: normalizeTime(match.time),
    },
    mode: "onChange",
  });

  function onSubmit(values: z.infer<typeof matchSchema>) {
    onSave(values);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4 p-4"
      >
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("shared.date")}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("shared.time")}</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="courtNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("editMatch.courtNumber")}</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("shared.status")}</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="costCourt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("editMatch.costCourt")}</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="costShirts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("editMatch.costShirts")}</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DrawerFooter>
          <Button
            type="submit"
            variant="default"
            disabled={!form.formState.isValid || isSaving}
          >
            {isSaving ? t("editMatch.saving") : t("editMatch.save")}
          </Button>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSaving}
            >
              {t("shared.cancel")}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </form>
    </Form>
  );
}
