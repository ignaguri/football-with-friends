import { sql } from "kysely";
import { getDatabase } from "@repo/shared/database";
import { getServiceFactory } from "@repo/shared/services";
import { NotificationTemplates } from "@repo/shared/services";

const COOLDOWN_DAYS = 3;

/**
 * Send engagement reminders to inactive users.
 * Only targets users with active push tokens who haven't
 * received an engagement reminder in the last 3 days.
 */
export async function sendEngagementReminders() {
  const db = getDatabase();
  const now = new Date();
  const cooldownDate = new Date(now.getTime() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();

  console.log(`[CRON] Sending engagement reminders (cooldown since ${cooldownDate})`);

  try {
    // Find users with active push tokens who haven't been reminded recently
    const eligibleUsers = await db
      .selectFrom("user")
      .innerJoin("push_tokens", "push_tokens.user_id", "user.id")
      .select("user.id")
      .where("push_tokens.active", "=", 1)
      .where((eb) =>
        eb.or([
          eb("user.last_engagement_reminder_at", "is", null),
          eb("user.last_engagement_reminder_at", "<", cooldownDate),
        ]),
      )
      .distinct()
      .execute();

    if (eligibleUsers.length === 0) {
      console.log("[CRON] No users eligible for engagement reminders");
      return { sent: 0 };
    }

    const userIds = eligibleUsers.map((u) => u.id);

    // Rotate message variant based on day of year
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000),
    );

    const notificationService = getServiceFactory().notificationService;
    await notificationService.sendToUsers(
      userIds,
      NotificationTemplates.engagementReminder(dayOfYear),
    );

    // Update last reminder timestamp
    await db
      .updateTable("user")
      .set({ last_engagement_reminder_at: now.toISOString() })
      .where(
        "id",
        "in",
        userIds,
      )
      .execute();

    console.log(`[CRON] Sent engagement reminders to ${userIds.length} users`);
    return { sent: userIds.length };
  } catch (error) {
    console.error("[CRON] Error sending engagement reminders:", error);
    throw error;
  }
}
