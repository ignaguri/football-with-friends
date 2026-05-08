import { sql } from "kysely";
import { getDatabase } from "@repo/shared/database";
import { NOTIFICATION_TYPES } from "@repo/shared/domain";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { getServiceFactory } from "@repo/shared/services";
import { NotificationTemplates } from "@repo/shared/services";
import { formatDateInAppTimezone } from "@repo/shared/utils";

import { recordForRecipients } from "../lib/notification-inbox";

const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000; // fire ~24h before kickoff

/**
 * Send match reminders 24h before kickoff (e.g. an 18:00 match on day D
 * triggers a reminder at 18:00 on day D-1, Europe/Berlin).
 *
 * Cron ticks every 30 min, so the actual fire time is the first tick at
 * or after `kickoff - 24h`. Each match is reminded at most once
 * (tracked via the `reminder_sent` column).
 */
export async function sendMatchReminders() {
  const db = getDatabase();

  const now = new Date();
  // Upper bound: matches kicking off at or before "now + 24h".
  // Lower bound: matches that haven't started yet — guards against firing
  // a stale reminder for a match still flagged "upcoming" past its kickoff.
  const horizon = new Date(now.getTime() + REMINDER_LEAD_MS);
  const horizonBerlin = formatDateInAppTimezone(horizon, "yyyy-MM-dd HH:mm");
  const nowBerlin = formatDateInAppTimezone(now, "yyyy-MM-dd HH:mm");

  console.log(
    `[CRON] Checking for matches kicking off in (${nowBerlin}, ${horizonBerlin}] (Berlin) for 24h reminders`,
  );

  try {
    // Find upcoming matches whose kickoff falls in the 24h reminder window
    // and that haven't been reminded yet.
    const matches = await db
      .selectFrom("matches")
      .selectAll()
      .where("status", "=", "upcoming")
      .where("reminder_sent", "=", 0)
      .where(sql<string>`(${sql.ref("date")} || ' ' || ${sql.ref("time")})`, ">", nowBerlin)
      .where(sql<string>`(${sql.ref("date")} || ' ' || ${sql.ref("time")})`, "<=", horizonBerlin)
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
        const payload = NotificationTemplates.matchReminder(info);

        if (match.group_id) {
          await recordForRecipients({
            userIds,
            groupId: match.group_id,
            type: NOTIFICATION_TYPES.MATCH_REMINDER,
            category: "match_reminder",
            payload,
          });
        }

        await notificationService.sendToUsers(userIds, payload, {
          category: "match_reminder",
        });
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
