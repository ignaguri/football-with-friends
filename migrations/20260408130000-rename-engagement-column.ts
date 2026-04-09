// Migration: rename last_engagement_reminder_at to camelCase for consistency

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  await sql`ALTER TABLE user RENAME COLUMN last_engagement_reminder_at TO lastEngagementReminderAt`.execute(db);
  console.log("✅ Renamed last_engagement_reminder_at to lastEngagementReminderAt");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  await sql`ALTER TABLE user RENAME COLUMN lastEngagementReminderAt TO last_engagement_reminder_at`.execute(db);
  console.log("↩️ Renamed lastEngagementReminderAt back to last_engagement_reminder_at");
};
