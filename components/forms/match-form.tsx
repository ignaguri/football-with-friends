"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetLocations } from "@/hooks/use-locations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Location } from "@/lib/domain/types";

// Base schema without translations - will be extended
const baseMatchSchema = z.object({
  date: z.date(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .refine(
      (val) => {
        const [, minutes] = val.split(":");
        return minutes === "00" || minutes === "30";
      },
      { message: "Time must be in 30-minute increments" },
    ),
  locationId: z.string().min(1, "Location is required"),
  costPerPlayer: z.string().optional(),
  costShirts: z.string().optional(),
});

export type MatchFormValues = z.infer<typeof baseMatchSchema>;

interface MatchFormProps {
  defaultValues?: Partial<MatchFormValues>;
  onSubmit: (values: MatchFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitText?: string;
  submitLoadingText?: string;
  showCancelButton?: boolean;
  cancelText?: string;
  className?: string;
}

export function MatchForm({
  defaultValues = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitText = "Save",
  submitLoadingText = "Saving...",
  showCancelButton = false,
  cancelText = "Cancel",
  className = "",
}: MatchFormProps) {
  const t = useTranslations();

  // Fetch locations for the selector
  const { data: locationsData, isLoading: isLoadingLocations } =
    useGetLocations();
  const locations: Location[] = locationsData?.locations || [];

  // Create schema with translations
  const matchSchema = z.object({
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
    locationId: z.string().min(1, "Location is required"),
    costPerPlayer: z.string().optional(),
    costShirts: z.string().optional(),
  });

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      date: defaultValues.date || new Date(),
      time: defaultValues.time || "",
      locationId: defaultValues.locationId || locations[0]?.id || "",
      costPerPlayer: defaultValues.costPerPlayer || "",
      costShirts: defaultValues.costShirts || "",
    },
    mode: "onChange",
  });

  function handleSubmit(values: MatchFormValues) {
    onSubmit(values);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={`flex flex-col gap-4 ${className}`}
      >
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("shared.date")}</FormLabel>
              <FormControl>
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  hidden={{ before: new Date() }}
                  className="w-full"
                />
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
              <FormLabel htmlFor="match-time">{t("shared.time")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  id="match-time"
                  type="time"
                  step="1800"
                  placeholder="HH:mm"
                  required
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="locationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="location-select">Location</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting || isLoadingLocations}
                >
                  <SelectTrigger id="location-select">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                        {location.address && ` - ${location.address}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="costPerPlayer"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="cost-court">
                {t("addMatch.costCourt")}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  id="cost-court"
                  type="number"
                  placeholder={t("addMatch.costPlaceholder")}
                  disabled={isSubmitting}
                />
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
              <FormLabel htmlFor="cost-shirts">
                {t("organizer.table.costShirts")}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  id="cost-shirts"
                  type="number"
                  placeholder={t("addMatch.costPlaceholder")}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button
            type="submit"
            variant="default"
            disabled={!form.formState.isValid || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? submitLoadingText : submitText}
          </Button>
          {showCancelButton && onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {cancelText}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
