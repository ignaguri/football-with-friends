import { getDatabase } from "@repo/shared/database";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { getServiceFactory } from "@repo/shared/services";
import { NotificationTemplates } from "@repo/shared/services";

/**
 * Update match statuses from "upcoming" to "completed"
 * and send voting reminders to participants.
 * Runs every 30 minutes via Cloudflare Cron Triggers.
 *
 * Uses native Date/Intl to stay within CF Workers CPU limits.
 */
export async function updateMatchStatuses() {
  const db = getDatabase();

  // Get today's date in Europe/Berlin timezone using native Intl
  const berlinDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // returns "YYYY-MM-DD"

  console.log(`[CRON] Updating upcoming matches before ${berlinDate}`);

  try {
    // Find matches that will transition (for voting reminders)
    const matchesToComplete = await db
      .selectFrom("matches")
      .select(["id", "date", "time", "location_id"])
      .where("status", "=", "upcoming")
      .where("date", "<", berlinDate)
      .execute();

    // Update statuses
    const result = await db
      .updateTable("matches")
      .set({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .where("status", "=", "upcoming")
      .where("date", "<", berlinDate)
      .execute();

    const updated = Number(result[0]?.numUpdatedRows ?? 0);
    console.log(`[CRON] Updated ${updated} matches to completed`);

    // Send voting reminders for newly completed matches
    if (matchesToComplete.length > 0) {
      const signupRepo = getRepositoryFactory().signups;
      const locationRepo = getRepositoryFactory().locations;
      const notificationService = getServiceFactory().notificationService;

      for (const match of matchesToComplete) {
        try {
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
              NotificationTemplates.votingOpen(info),
            );
            console.log(`[CRON] Sent voting reminder for match ${match.id} to ${userIds.length} users`);
          }
        } catch (error) {
          console.error(`[CRON] Failed to send voting reminder for match ${match.id}:`, error);
        }
      }
    }

    return { updated };
  } catch (error) {
    console.error("[CRON] Error updating match statuses:", error);
    throw error;
  }
}
