// API route for managing notification preferences

import { auth } from "@/lib/auth";
import { getDatabase } from "@/lib/database/connection";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

const db = getDatabase();

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const preferences = await db
      .selectFrom("notification_preferences")
      .selectAll()
      .where("user_id", "=", session.user.id)
      .executeTakeFirst();

    if (!preferences) {
      // Return default preferences if none exist
      return NextResponse.json({
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
      });
    }

    // Transform database format to API format
    return NextResponse.json({
      matchReminders: preferences.match_reminders,
      matchUpdates: preferences.match_updates,
      playerChanges: preferences.player_changes,
      newMatches: preferences.new_matches,
      matchCancelled: preferences.match_cancelled,
      reminderTimes: JSON.parse(preferences.reminder_times),
      quietHoursStart: preferences.quiet_hours_start,
      quietHoursEnd: preferences.quiet_hours_end,
      timezone: preferences.timezone,
      locationRadiusKm: preferences.location_radius_km,
      preferredLocations: preferences.preferred_locations
        ? JSON.parse(preferences.preferred_locations)
        : [],
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Validate preferences
    const validatedPreferences = validatePreferences(body);
    if (!validatedPreferences.valid) {
      return NextResponse.json(
        {
          error: "Invalid preferences data",
          details: validatedPreferences.errors,
        },
        { status: 400 },
      );
    }

    const preferences = validatedPreferences.data;

    // Check if preferences already exist
    const existingPrefs = await db
      .selectFrom("notification_preferences")
      .select(["id"])
      .where("user_id", "=", session.user.id)
      .executeTakeFirst();

    const prefData = {
      user_id: session.user.id,
      match_reminders: preferences.matchReminders,
      match_updates: preferences.matchUpdates,
      player_changes: preferences.playerChanges,
      new_matches: preferences.newMatches,
      match_cancelled: preferences.matchCancelled,
      reminder_times: JSON.stringify(preferences.reminderTimes),
      quiet_hours_start: preferences.quietHoursStart,
      quiet_hours_end: preferences.quietHoursEnd,
      timezone: preferences.timezone,
      location_radius_km: preferences.locationRadiusKm,
      preferred_locations: preferences.preferredLocations?.length
        ? JSON.stringify(preferences.preferredLocations)
        : null,
      updated_at: new Date().toISOString(),
    };

    if (existingPrefs) {
      // Update existing preferences
      await db
        .updateTable("notification_preferences")
        .set(prefData)
        .where("user_id", "=", session.user.id)
        .execute();
    } else {
      // Create new preferences
      await db
        .insertInto("notification_preferences")
        .values({
          id: nanoid(),
          ...prefData,
          created_at: new Date().toISOString(),
        })
        .execute();
    }

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 },
    );
  }
}

// Helper function to validate preferences data
function validatePreferences(data: any): {
  valid: boolean;
  data?: any;
  errors?: string[];
} {
  const errors: string[] = [];

  // Required boolean fields
  const booleanFields = [
    "matchReminders",
    "matchUpdates",
    "playerChanges",
    "newMatches",
    "matchCancelled",
  ];

  for (const field of booleanFields) {
    if (typeof data[field] !== "boolean") {
      errors.push(`${field} must be a boolean`);
    }
  }

  // Validate reminderTimes array
  if (!Array.isArray(data.reminderTimes)) {
    errors.push("reminderTimes must be an array");
  } else {
    for (const time of data.reminderTimes) {
      if (typeof time !== "number" || time < 0) {
        errors.push("reminderTimes must contain positive numbers");
        break;
      }
    }
  }

  // Validate quiet hours
  if (
    typeof data.quietHoursStart !== "number" ||
    data.quietHoursStart < 0 ||
    data.quietHoursStart > 23
  ) {
    errors.push("quietHoursStart must be between 0 and 23");
  }

  if (
    typeof data.quietHoursEnd !== "number" ||
    data.quietHoursEnd < 0 ||
    data.quietHoursEnd > 23
  ) {
    errors.push("quietHoursEnd must be between 0 and 23");
  }

  // Validate timezone
  if (typeof data.timezone !== "string" || !data.timezone.trim()) {
    errors.push("timezone must be a non-empty string");
  }

  // Validate location radius
  if (typeof data.locationRadiusKm !== "number" || data.locationRadiusKm < 1) {
    errors.push("locationRadiusKm must be a positive number");
  }

  // Validate preferred locations (optional)
  if (data.preferredLocations !== undefined) {
    if (!Array.isArray(data.preferredLocations)) {
      errors.push("preferredLocations must be an array");
    } else {
      for (const location of data.preferredLocations) {
        if (typeof location !== "string") {
          errors.push("preferredLocations must contain strings");
          break;
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}
