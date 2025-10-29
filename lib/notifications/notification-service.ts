// Notification service facade with business logic for football matches

import { getDatabase } from "@/lib/database/connection";
import { formatDateInAppTimezone } from "@/lib/utils/timezone";

import type {
  NotificationProvider,
  NotificationRequest,
  ScheduledNotificationRequest,
  NotificationType,
  MatchNotificationContext,
  NotificationPreferences,
} from "./types";

import { createNotificationProvider } from "./provider-factory";

export class NotificationService {
  private provider: NotificationProvider;
  private db = getDatabase();

  constructor() {
    this.provider = createNotificationProvider();
  }

  // High-level business methods for match notifications

  /**
   * Send match reminder notification
   */
  async sendMatchReminder(
    matchId: string,
    reminderType: "24h" | "2h" | "30m",
  ): Promise<void> {
    const context = await this.getMatchContext(matchId);
    const signups = await this.getMatchSignups(matchId);

    // Send reminders to all signed-up players
    const notifications = signups
      .filter((signup) => signup.user_id)
      .map((signup) =>
        this.buildMatchReminderNotification(
          context,
          signup.user_id!,
          reminderType,
        ),
      );

    await this.provider.sendBulk(notifications);
  }

  /**
   * Schedule all reminders for a match
   */
  async scheduleMatchReminders(matchId: string): Promise<void> {
    const context = await this.getMatchContext(matchId);
    const signups = await this.getMatchSignups(matchId);
    const matchDateTime = new Date(
      `${context.match.date} ${context.match.time}`,
    );

    // Calculate reminder times
    const reminderTimes = [
      { type: "24h" as const, hours: 24 },
      { type: "2h" as const, hours: 2 },
      { type: "30m" as const, hours: 0.5 },
    ];

    for (const signup of signups) {
      if (!signup.user_id) continue;
      const userPrefs = await this.getUserPreferences(signup.user_id);

      if (!userPrefs.matchReminders) continue;

      for (const reminder of reminderTimes) {
        if (!userPrefs.reminderTimes.includes(reminder.hours)) continue;

        const scheduledFor = new Date(
          matchDateTime.getTime() - reminder.hours * 60 * 60 * 1000,
        );

        // Skip if already past
        if (scheduledFor <= new Date()) continue;

        // Check quiet hours
        if (this.isDuringQuietHours(scheduledFor, userPrefs)) continue;

        const notification = this.buildScheduledMatchReminderNotification(
          context,
          signup.user_id,
          reminder.type,
          scheduledFor,
        );

        await this.provider.scheduleNotification(notification);
      }
    }
  }

  /**
   * Notify about match updates (time, location, etc.)
   */
  async notifyMatchUpdate(
    matchId: string,
    changeType: "time" | "location" | "court" | "cost" | "general",
  ): Promise<void> {
    const context = await this.getMatchContext(matchId);
    const signups = await this.getMatchSignups(matchId);

    const notifications: NotificationRequest[] = [];

    for (const signup of signups) {
      if (!signup.user_id) continue;
      const prefs = await this.getUserPreferences(signup.user_id);
      if (prefs.matchUpdates) {
        notifications.push(
          this.buildMatchUpdateNotification(
            context,
            signup.user_id,
            changeType,
          ),
        );
      }
    }

    await this.provider.sendBulk(notifications);
  }

  /**
   * Notify organizer when player joins/leaves
   */
  async notifyPlayerChange(
    matchId: string,
    playerName: string,
    action: "joined" | "left",
  ): Promise<void> {
    const context = await this.getMatchContext(matchId);
    const organizerPrefs = await this.getUserPreferences(context.organizer.id);

    if (!organizerPrefs.playerChanges) return;

    const notification = this.buildPlayerChangeNotification(
      context,
      playerName,
      action,
    );

    await this.provider.send(notification);
  }

  /**
   * Notify when match is cancelled
   */
  async notifyMatchCancellation(
    matchId: string,
    reason?: string,
  ): Promise<void> {
    const context = await this.getMatchContext(matchId);
    const signups = await this.getMatchSignups(matchId);

    const notifications: NotificationRequest[] = [];

    for (const signup of signups) {
      if (!signup.user_id) continue;
      const prefs = await this.getUserPreferences(signup.user_id);
      if (prefs.matchCancelled) {
        notifications.push(
          this.buildMatchCancellationNotification(
            context,
            signup.user_id,
            reason,
          ),
        );
      }
    }

    await this.provider.sendBulk(notifications);

    // Cancel any scheduled reminders
    await this.cancelMatchReminders(matchId);
  }

  /**
   * Notify about new matches in preferred locations
   */
  async notifyNewMatch(matchId: string): Promise<void> {
    const context = await this.getMatchContext(matchId);

    // Find users who have this location in their preferences
    const interestedUsers = await this.db
      .selectFrom("notification_preferences")
      .select(["user_id"])
      .where("new_matches", "=", true)
      .where("preferred_locations", "like", `%${context.match.location}%`)
      .execute();

    const notifications = interestedUsers.map((user) =>
      this.buildNewMatchNotification(context, user.user_id),
    );

    await this.provider.sendBulk(notifications);
  }

  // Private helper methods

  private async getMatchContext(
    matchId: string,
  ): Promise<MatchNotificationContext> {
    const match = await this.db
      .selectFrom("matches")
      .leftJoin("locations", "matches.location_id", "locations.id")
      .leftJoin("courts", "matches.court_id", "courts.id")
      .leftJoin("user", "matches.created_by_user_id", "user.id")
      .select([
        "matches.id",
        "matches.date",
        "matches.time",
        "matches.max_players",
        "locations.name as location_name",
        "courts.name as court_name",
        "user.id as organizer_id",
        "user.name as organizer_name",
        "user.email as organizer_email",
      ])
      .where("matches.id", "=", matchId)
      .executeTakeFirstOrThrow();

    // Count current players
    const signupCount = await this.db
      .selectFrom("signups")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("match_id", "=", matchId)
      .where("status", "!=", "CANCELLED")
      .executeTakeFirstOrThrow();

    return {
      matchId,
      match: {
        date: match.date,
        time: match.time,
        location: match.location_name || "Unknown Location",
        court: match.court_name || undefined,
        maxPlayers: match.max_players,
        currentPlayers: signupCount.count,
      },
      organizer: {
        id: match.organizer_id || "",
        name: match.organizer_name || "Unknown",
        email: match.organizer_email || "",
      },
    };
  }

  private async getMatchSignups(matchId: string) {
    return await this.db
      .selectFrom("signups")
      .select(["user_id"])
      .where("match_id", "=", matchId)
      .where("status", "!=", "CANCELLED")
      .where("user_id", "is not", null)
      .execute();
  }

  private async getUserPreferences(
    userId: string,
  ): Promise<NotificationPreferences> {
    const prefs = await this.db
      .selectFrom("notification_preferences")
      .selectAll()
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (!prefs) {
      // Return default preferences
      return {
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
      };
    }

    return {
      matchReminders: prefs.match_reminders,
      matchUpdates: prefs.match_updates,
      playerChanges: prefs.player_changes,
      newMatches: prefs.new_matches,
      matchCancelled: prefs.match_cancelled,
      reminderTimes: JSON.parse(prefs.reminder_times),
      quietHoursStart: prefs.quiet_hours_start,
      quietHoursEnd: prefs.quiet_hours_end,
      timezone: prefs.timezone,
      locationRadiusKm: prefs.location_radius_km,
      preferredLocations: prefs.preferred_locations
        ? JSON.parse(prefs.preferred_locations)
        : undefined,
    };
  }

  private isDuringQuietHours(
    date: Date,
    prefs: NotificationPreferences,
  ): boolean {
    const hour = date.getHours();
    const { quietHoursStart, quietHoursEnd } = prefs;

    if (quietHoursStart > quietHoursEnd) {
      // Quiet hours span midnight (e.g., 22:00 - 08:00)
      return hour >= quietHoursStart || hour < quietHoursEnd;
    } else {
      // Quiet hours within same day (e.g., 14:00 - 16:00)
      return hour >= quietHoursStart && hour < quietHoursEnd;
    }
  }

  // Notification builders

  private buildMatchReminderNotification(
    context: MatchNotificationContext,
    userId: string,
    reminderType: "24h" | "2h" | "30m",
  ): NotificationRequest {
    const timeText = {
      "24h": "tomorrow",
      "2h": "in 2 hours",
      "30m": "in 30 minutes",
    }[reminderType];

    const formattedDate = formatDateInAppTimezone(
      new Date(context.match.date),
      "PPP",
    );
    const formattedTime = context.match.time; // Time is already in HH:MM format

    return {
      userId,
      type: "match_reminder" as NotificationType,
      title: `Match ${timeText}!`,
      body: `${formattedDate} at ${formattedTime} - ${context.match.location}${context.match.court ? ` (${context.match.court})` : ""}`,
      data: { matchId: context.matchId },
      urgent: reminderType === "30m",
      actions: [
        {
          action: "view",
          title: "View Match",
          url: `/matches/${context.matchId}`,
        },
      ],
    };
  }

  private buildScheduledMatchReminderNotification(
    context: MatchNotificationContext,
    userId: string,
    reminderType: "24h" | "2h" | "30m",
    scheduledFor: Date,
  ): ScheduledNotificationRequest {
    const baseNotification = this.buildMatchReminderNotification(
      context,
      userId,
      reminderType,
    );

    return {
      ...baseNotification,
      scheduledFor,
      priority: reminderType === "30m" ? "high" : "normal",
    };
  }

  private buildMatchUpdateNotification(
    context: MatchNotificationContext,
    userId: string,
    changeType: string,
  ): NotificationRequest {
    const formattedDate = formatDateInAppTimezone(
      new Date(context.match.date),
      "PPP",
    );
    const formattedTime = context.match.time; // Time is already in HH:MM format

    return {
      userId,
      type: "match_update" as NotificationType,
      title: "Match Updated",
      body: `Your match on ${formattedDate} at ${formattedTime} has been updated`,
      data: { matchId: context.matchId, changeType },
      actions: [
        {
          action: "view",
          title: "View Changes",
          url: `/matches/${context.matchId}`,
        },
      ],
    };
  }

  private buildPlayerChangeNotification(
    context: MatchNotificationContext,
    playerName: string,
    action: "joined" | "left",
  ): NotificationRequest {
    const formattedDate = formatDateInAppTimezone(
      new Date(context.match.date),
      "PPP",
    );

    return {
      userId: context.organizer.id,
      type: (action === "joined"
        ? "player_joined"
        : "player_left") as NotificationType,
      title: `Player ${action}`,
      body: `${playerName} ${action} your match on ${formattedDate} (${context.match.currentPlayers}/${context.match.maxPlayers})`,
      data: { matchId: context.matchId, playerName },
      actions: [
        {
          action: "view",
          title: "View Match",
          url: `/organizer/matches/${context.matchId}`,
        },
      ],
    };
  }

  private buildMatchCancellationNotification(
    context: MatchNotificationContext,
    userId: string,
    reason?: string,
  ): NotificationRequest {
    const formattedDate = formatDateInAppTimezone(
      new Date(context.match.date),
      "PPP",
    );
    const reasonText = reason ? ` Reason: ${reason}` : "";

    return {
      userId,
      type: "match_cancelled" as NotificationType,
      title: "Match Cancelled",
      body: `Your match on ${formattedDate} at ${context.match.location} has been cancelled.${reasonText}`,
      data: { matchId: context.matchId, reason },
      urgent: true,
    };
  }

  private buildNewMatchNotification(
    context: MatchNotificationContext,
    userId: string,
  ): NotificationRequest {
    const formattedDate = formatDateInAppTimezone(
      new Date(context.match.date),
      "PPP",
    );
    const formattedTime = context.match.time; // Time is already in HH:MM format

    return {
      userId,
      type: "new_match" as NotificationType,
      title: "New Match Available",
      body: `${formattedDate} at ${formattedTime} - ${context.match.location}`,
      data: { matchId: context.matchId },
      actions: [
        {
          action: "view",
          title: "View Match",
          url: `/matches/${context.matchId}`,
        },
        {
          action: "join",
          title: "Join Now",
          url: `/matches/${context.matchId}?action=join`,
        },
      ],
    };
  }

  private async cancelMatchReminders(matchId: string): Promise<void> {
    const scheduledNotifications = await this.db
      .selectFrom("notification_queue")
      .select(["id"])
      .where("match_id", "=", matchId)
      .where("sent_at", "is", null)
      .execute();

    await Promise.all(
      scheduledNotifications.map((notification) =>
        this.provider.cancelNotification(notification.id),
      ),
    );
  }
}
