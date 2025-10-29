"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const preferencesSchema = z.object({
  matchReminders: z.boolean(),
  matchUpdates: z.boolean(),
  playerChanges: z.boolean(),
  newMatches: z.boolean(),
  matchCancelled: z.boolean(),
  reminderTimes: z
    .array(z.number())
    .min(1, "Select at least one reminder time"),
  quietHoursStart: z.number().min(0).max(23),
  quietHoursEnd: z.number().min(0).max(23),
  timezone: z.string(),
  locationRadiusKm: z.number().min(1).max(100),
  preferredLocations: z.array(z.string()).optional(),
});

type PreferencesFormData = z.infer<typeof preferencesSchema>;

export function NotificationPreferences() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      matchReminders: true,
      matchUpdates: true,
      playerChanges: false,
      newMatches: false,
      matchCancelled: true,
      reminderTimes: [24, 2, 0.5],
      quietHoursStart: 22,
      quietHoursEnd: 8,
      timezone: "Europe/Berlin",
      locationRadiusKm: 10,
      preferredLocations: [],
    },
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setIsFetching(true);
      const response = await fetch("/api/push/preferences");
      if (response.ok) {
        const data = await response.json();
        form.reset(data);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast.error("Failed to load notification preferences");
    } finally {
      setIsFetching(false);
    }
  };

  const onSubmit = async (data: PreferencesFormData) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/push/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update preferences");
      }

      toast.success("Notification preferences updated");
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Failed to update notification preferences");
    } finally {
      setIsLoading(false);
    }
  };

  const reminderTimeOptions = [
    { value: 24, label: "24 hours before" },
    { value: 2, label: "2 hours before" },
    { value: 0.5, label: "30 minutes before" },
  ];

  if (isFetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading preferences...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Notification Types */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notification Types</CardTitle>
            </div>
            <CardDescription>
              Choose which notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="matchReminders"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Match Reminders</FormLabel>
                    <FormDescription>
                      Get reminded before your upcoming matches
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="matchUpdates"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Match Updates</FormLabel>
                    <FormDescription>
                      Changes to time, location, or other match details
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="playerChanges"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Player Changes (Organizers)</FormLabel>
                    <FormDescription>
                      When players join or leave your organized matches
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newMatches"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>New Match Alerts</FormLabel>
                    <FormDescription>
                      When new matches are created in your preferred locations
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="matchCancelled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Match Cancellations</FormLabel>
                    <FormDescription>
                      When matches you signed up for are cancelled
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Reminder Times */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Reminder Timing</CardTitle>
            </div>
            <CardDescription>
              Choose when to receive match reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="reminderTimes"
              render={() => (
                <FormItem>
                  {reminderTimeOptions.map((option) => (
                    <FormField
                      key={option.value}
                      control={form.control}
                      name="reminderTimes"
                      render={({ field }) => (
                        <FormItem
                          key={option.value}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(option.value)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([
                                      ...field.value,
                                      option.value,
                                    ])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== option.value,
                                      ),
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {option.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="quietHoursStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quiet Hours Start</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>Hour (0-23)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quietHoursEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quiet Hours End</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>Hour (0-23)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              No notifications will be sent during quiet hours
            </p>
          </CardContent>
        </Card>

        {/* Location Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <CardTitle>Location Preferences</CardTitle>
            </div>
            <CardDescription>
              Set your preferred locations for new match alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="locationRadiusKm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Radius (km)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum distance for new match alerts
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isLoading}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
