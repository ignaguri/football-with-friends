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
import { useGetActiveCourtsByLocationId } from "@/hooks/use-courts";
import { useGetLocations } from "@/hooks/use-locations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Location, Court } from "@/lib/domain/types";

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
  courtId: z.string().optional(),
  maxPlayers: z
    .number()
    .min(1, "Max players must be at least 1")
    .max(50, "Max players cannot exceed 50")
    .default(10),
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
  const locations: Location[] = (locationsData?.locations || []).map((loc) => ({
    ...loc,
    createdAt: new Date(loc.createdAt),
    updatedAt: new Date(loc.updatedAt),
  }));

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
    locationId: z.string().min(1, t("addMatch.locationRequired")),
    courtId: z.string().optional(),
    maxPlayers: z
      .number()
      .min(1, t("addMatch.maxPlayersMin"))
      .max(50, t("addMatch.maxPlayersMax")),
    costPerPlayer: z.string().optional(),
    costShirts: z.string().optional(),
  });

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      date: defaultValues.date || new Date(),
      time: defaultValues.time || "",
      locationId: defaultValues.locationId || locations[0]?.id || "",
      courtId: defaultValues.courtId || "none",
      maxPlayers: defaultValues.maxPlayers || 10,
      costPerPlayer: defaultValues.costPerPlayer || "",
      costShirts: defaultValues.costShirts || "",
    },
    mode: "onChange",
  });

  // Watch locationId to fetch courts when location changes
  const selectedLocationId = form.watch("locationId");
  const { data: courtsData, isLoading: isLoadingCourts } =
    useGetActiveCourtsByLocationId(selectedLocationId);
  const courts: Court[] = (courtsData?.courts || []).map((court: Court) => ({
    ...court,
    createdAt: new Date(court.createdAt),
    updatedAt: new Date(court.updatedAt),
  }));

  function handleSubmit(values: MatchFormValues) {
    // Convert "none" back to empty string for courtId
    const processedValues = {
      ...values,
      courtId: values.courtId === "none" ? "" : values.courtId,
    };
    onSubmit(processedValues);
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
              <FormLabel htmlFor="location-select">
                {t("addMatch.location")}
              </FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Reset court selection when location changes
                    form.setValue("courtId", "none");
                  }}
                  disabled={isSubmitting || isLoadingLocations}
                >
                  <SelectTrigger id="location-select">
                    <SelectValue placeholder={t("addMatch.selectLocation")} />
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
          name="courtId"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="court-select">
                {t("addMatch.court")}
              </FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={
                    isSubmitting || isLoadingCourts || !selectedLocationId
                  }
                >
                  <SelectTrigger id="court-select">
                    <SelectValue placeholder={t("addMatch.selectCourt")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t("addMatch.noSpecificCourt")}
                    </SelectItem>
                    {courts.map((court) => (
                      <SelectItem key={court.id} value={court.id}>
                        {court.name}
                        {court.description && ` - ${court.description}`}
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
          name="maxPlayers"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="max-players">
                {t("addMatch.maxPlayers")}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  id="max-players"
                  type="number"
                  min="1"
                  max="50"
                  placeholder="10"
                  disabled={isSubmitting}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value) || 10)
                  }
                />
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
