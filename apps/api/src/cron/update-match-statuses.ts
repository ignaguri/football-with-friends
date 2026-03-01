import { getDatabase } from "@repo/shared/database";

/**
 * Update match statuses from "upcoming" to "completed"
 * Runs every 6 hours via Cloudflare Cron Triggers
 *
 * Uses a single UPDATE query and native Date to stay within
 * CF Workers CPU limits (no date-fns imports).
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
    // Single UPDATE query - no need to SELECT first
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

    return { updated };
  } catch (error) {
    console.error("[CRON] Error updating match statuses:", error);
    throw error;
  }
}
