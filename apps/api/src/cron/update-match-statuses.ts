import { getDatabase } from "@repo/shared/database";
import { NOTIFICATION_TYPES } from "@repo/shared/domain";
import { getServiceFactory, NotificationTemplates } from "@repo/shared/services";

import { recordForRecipients } from "../lib/notification-inbox";

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
      .select(["id", "date", "time", "location_id", "group_id"])
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
      const notificationService = getServiceFactory().notificationService;
      const matchIds = matchesToComplete.map((m) => m.id);
      const locationIds = [...new Set(matchesToComplete.map((m) => m.location_id))];

      const [signupRows, locations] = await Promise.all([
        db
          .selectFrom("signups")
          .select(["match_id", "user_id"])
          .where("match_id", "in", matchIds)
          .where("status", "!=", "CANCELLED")
          .where("user_id", "is not", null)
          .execute(),
        db
          .selectFrom("locations")
          .select(["id", "name"])
          .where("id", "in", locationIds)
          .execute(),
      ]);

      const userIdsByMatch = new Map<string, string[]>();
      for (const row of signupRows) {
        if (!row.user_id) continue;
        const ids = userIdsByMatch.get(row.match_id) ?? [];
        ids.push(row.user_id);
        userIdsByMatch.set(row.match_id, ids);
      }
      const locationsById = new Map(locations.map((l) => [l.id, l]));

      for (const match of matchesToComplete) {
        try {
          const userIds = [...new Set(userIdsByMatch.get(match.id) ?? [])];
          if (userIds.length === 0) continue;

          const location = locationsById.get(match.location_id);
          const info = {
            id: match.id,
            date: match.date,
            time: match.time,
            locationName: location?.name,
          };
          const payload = NotificationTemplates.votingOpen(info);

          if (match.group_id) {
            await recordForRecipients({
              userIds,
              groupId: match.group_id,
              type: NOTIFICATION_TYPES.VOTING_OPEN,
              payload,
            });
          }

          await notificationService.sendToUsers(userIds, payload);
          console.log(`[CRON] Sent voting reminder for match ${match.id} to ${userIds.length} users`);
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
