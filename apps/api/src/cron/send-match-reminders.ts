import { getDatabase } from "@repo/shared/database";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { getServiceFactory } from "@repo/shared/services";
import { NotificationTemplates } from "@repo/shared/services";

/**
 * Send match reminders for matches happening tomorrow.
 * Only sends once per match (tracked via reminder_sent column).
 */
export async function sendMatchReminders() {
  const db = getDatabase();

  // Get tomorrow's date in Europe/Berlin timezone
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow);

  console.log(`[CRON] Checking for matches on ${tomorrowDate} to send reminders`);

  try {
    // Find upcoming matches tomorrow that haven't had reminders sent
    const matches = await db
      .selectFrom("matches")
      .selectAll()
      .where("status", "=", "upcoming")
      .where("date", "=", tomorrowDate)
      .where("reminder_sent", "=", 0)
      .execute();

    if (matches.length === 0) {
      console.log("[CRON] No matches need reminders");
      return { sent: 0 };
    }

    const signupRepo = getRepositoryFactory().signups;
    const locationRepo = getRepositoryFactory().locations;
    const notificationService = getServiceFactory().notificationService;
    let totalSent = 0;

    for (const match of matches) {
      const [userIds, location] = await Promise.all([
        signupRepo.getSignedUpUserIds(match.id),
        locationRepo.findById(match.location_id),
      ]);

      if (userIds.length > 0) {
        const info = {
          id: match.id,
          date: match.date,
          time: match.time,
          locationName: location?.name,
        };

        await notificationService.sendToUsers(
          userIds,
          NotificationTemplates.matchReminder(info),
        );
        totalSent += userIds.length;
      }

      // Mark reminder as sent
      await db
        .updateTable("matches")
        .set({ reminder_sent: 1 })
        .where("id", "=", match.id)
        .execute();
    }

    console.log(`[CRON] Sent ${totalSent} match reminders for ${matches.length} matches`);
    return { sent: totalSent, matches: matches.length };
  } catch (error) {
    console.error("[CRON] Error sending match reminders:", error);
    throw error;
  }
}
