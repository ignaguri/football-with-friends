import { getDatabase } from "@repo/shared/database";
import { format, subHours } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

/**
 * Update match statuses from "upcoming" to "completed"
 * Runs every 6 hours via Cloudflare Cron Triggers
 *
 * Transition logic:
 * - Find all matches with status = "upcoming"
 * - Check if match.date < today - 2 hours (in Europe/Berlin timezone)
 * - Update those matches to status = "completed"
 */
export async function updateMatchStatuses() {
  const db = getDatabase();
  const timezone = "Europe/Berlin";
  const now = new Date();

  // Calculate cutoff: 2 hours ago in Berlin time
  const cutoffTime = subHours(now, 2);
  const cutoffDate = format(fromZonedTime(cutoffTime, timezone), "yyyy-MM-dd");

  console.log(
    `[CRON] Checking for matches to complete. Cutoff date: ${cutoffDate}`
  );

  try {
    // Find matches to complete
    const matchesToComplete = await db
      .selectFrom("matches")
      .selectAll()
      .where("status", "=", "upcoming")
      .where("date", "<", cutoffDate)
      .execute();

    if (matchesToComplete.length === 0) {
      console.log("[CRON] No matches to update");
      return { updated: 0 };
    }

    // Update in batch
    const matchIds = matchesToComplete.map((m) => m.id);
    const result = await db
      .updateTable("matches")
      .set({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .where("id", "in", matchIds)
      .execute();

    console.log(
      `[CRON] Updated ${matchesToComplete.length} matches to completed`,
      matchIds
    );

    return { updated: matchesToComplete.length };
  } catch (error) {
    console.error("[CRON] Error updating match statuses:", error);
    throw error;
  }
}
