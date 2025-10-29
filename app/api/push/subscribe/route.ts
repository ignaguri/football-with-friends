// API route for subscribing to push notifications

import { auth } from "@/lib/auth";
import { getDatabase } from "@/lib/database/connection";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

const db = getDatabase();

export async function POST(request: NextRequest) {
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
    const { subscription, preferences } = body;

    // Validate subscription object
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 },
      );
    }

    const { endpoint, keys } = subscription;
    if (!keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Missing subscription keys" },
        { status: 400 },
      );
    }

    // Parse user agent for browser info
    const userAgent = request.headers.get("user-agent") || "";
    const browserInfo = parseBrowserInfo(userAgent);

    // Check if subscription already exists
    const existingSubscription = await db
      .selectFrom("push_subscriptions")
      .select(["id"])
      .where("endpoint", "=", endpoint)
      .executeTakeFirst();

    let subscriptionId: string;

    if (existingSubscription) {
      // Update existing subscription
      subscriptionId = existingSubscription.id;
      await db
        .updateTable("push_subscriptions")
        .set({
          user_id: session.user.id,
          p256dh_key: keys.p256dh,
          auth_key: keys.auth,
          user_agent: userAgent,
          browser_info: JSON.stringify(browserInfo),
          active: true,
          last_used: new Date().toISOString(),
        })
        .where("endpoint", "=", endpoint)
        .execute();
    } else {
      // Create new subscription
      subscriptionId = nanoid();
      await db
        .insertInto("push_subscriptions")
        .values({
          id: subscriptionId,
          user_id: session.user.id,
          endpoint,
          p256dh_key: keys.p256dh,
          auth_key: keys.auth,
          user_agent: userAgent,
          browser_info: JSON.stringify(browserInfo),
          active: true,
          vapid_subject: process.env.VAPID_SUBJECT,
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString(),
        })
        .execute();
    }

    // Handle notification preferences
    if (preferences) {
      await upsertNotificationPreferences(session.user.id, preferences);
    } else {
      // Create default preferences if none exist
      const existingPrefs = await db
        .selectFrom("notification_preferences")
        .select(["id"])
        .where("user_id", "=", session.user.id)
        .executeTakeFirst();

      if (!existingPrefs) {
        await db
          .insertInto("notification_preferences")
          .values({
            id: nanoid(),
            user_id: session.user.id,
            match_reminders: true,
            match_updates: true,
            player_changes: false,
            new_matches: false,
            match_cancelled: true,
            reminder_times: JSON.stringify([24, 2, 0.5]),
            quiet_hours_start: 22,
            quiet_hours_end: 8,
            timezone: "Europe/Berlin",
            location_radius_km: 10,
            preferred_locations: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .execute();
      }
    }

    return NextResponse.json({
      success: true,
      subscriptionId,
      message: "Push notifications enabled successfully",
    });
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    return NextResponse.json(
      { error: "Failed to subscribe to push notifications" },
      { status: 500 },
    );
  }
}

// Helper function to parse browser information from user agent
function parseBrowserInfo(userAgent: string) {
  const browserRegex = {
    Chrome: /Chrome\/(\d+)/,
    Firefox: /Firefox\/(\d+)/,
    Safari: /Version\/(\d+).*Safari/,
    Edge: /Edge\/(\d+)/,
  };

  const osRegex = {
    Windows: /Windows NT/,
    macOS: /Mac OS X/,
    Linux: /Linux/,
    Android: /Android/,
    iOS: /iPhone|iPad/,
  };

  let browserName = "Unknown";
  let browserVersion = "Unknown";
  let osName = "Unknown";

  // Detect browser
  for (const [browser, regex] of Object.entries(browserRegex)) {
    const match = userAgent.match(regex);
    if (match) {
      browserName = browser;
      browserVersion = match[1];
      break;
    }
  }

  // Detect OS
  for (const [os, regex] of Object.entries(osRegex)) {
    if (regex.test(userAgent)) {
      osName = os;
      break;
    }
  }

  return {
    name: browserName,
    version: browserVersion,
    os: osName,
  };
}

// Helper function to upsert notification preferences
async function upsertNotificationPreferences(userId: string, preferences: any) {
  const existingPrefs = await db
    .selectFrom("notification_preferences")
    .select(["id"])
    .where("user_id", "=", userId)
    .executeTakeFirst();

  const prefData = {
    user_id: userId,
    match_reminders: preferences.matchReminders ?? true,
    match_updates: preferences.matchUpdates ?? true,
    player_changes: preferences.playerChanges ?? false,
    new_matches: preferences.newMatches ?? false,
    match_cancelled: preferences.matchCancelled ?? true,
    reminder_times: JSON.stringify(preferences.reminderTimes ?? [24, 2, 0.5]),
    quiet_hours_start: preferences.quietHoursStart ?? 22,
    quiet_hours_end: preferences.quietHoursEnd ?? 8,
    timezone: preferences.timezone ?? "Europe/Berlin",
    location_radius_km: preferences.locationRadiusKm ?? 10,
    preferred_locations: preferences.preferredLocations
      ? JSON.stringify(preferences.preferredLocations)
      : null,
    updated_at: new Date().toISOString(),
  };

  if (existingPrefs) {
    await db
      .updateTable("notification_preferences")
      .set(prefData)
      .where("user_id", "=", userId)
      .execute();
  } else {
    await db
      .insertInto("notification_preferences")
      .values({
        id: nanoid(),
        ...prefData,
        created_at: new Date().toISOString(),
      })
      .execute();
  }
}
