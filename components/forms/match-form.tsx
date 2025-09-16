"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MobileDatePicker } from "@/components/ui/mobile-date-picker";
import { MobileTimePicker } from "@/components/ui/mobile-time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetActiveCourtsByLocationId } from "@/hooks/use-courts";
import { useGetLocations } from "@/hooks/use-locations";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Location, Court } from "@/lib/domain/types";

// Base schema for form values
const createMatchFormSchema = () =>
  z.object({
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

export type MatchFormValues = z.infer<ReturnType<typeof createMatchFormSchema>>;

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
        className={cn("flex flex-col gap-3 sm:gap-4", className)}
      >
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <MobileDatePicker
                  value={field.value}
                  onChange={field.onChange}
                  label={t("shared.date")}
                  placeholder={t("addMatch.selectDate")}
                  disabled={isSubmitting}
                  required
                  id="match-date"
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
              <FormControl>
                <MobileTimePicker
                  value={field.value}
                  onChange={field.onChange}
                  label={t("shared.time")}
                  placeholder={t("addMatch.selectTime")}
                  disabled={isSubmitting}
                  required
                  id="match-time"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                    <SelectTrigger id="location-select" className="h-14">
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
                    <SelectTrigger id="court-select" className="h-14">
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
                    className="h-14"
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
                    className="h-14"
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
                    className="h-14"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-3">
          <Button
            type="submit"
            variant="default"
            disabled={!form.formState.isValid || isSubmitting}
            className="flex-1 h-14"
          >
            {isSubmitting ? submitLoadingText : submitText}
          </Button>
          {showCancelButton && onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 h-14"
            >
              {cancelText}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
