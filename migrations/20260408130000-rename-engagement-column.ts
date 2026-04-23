// Migration: rename last_engagement_reminder_at to camelCase for consistency
// Idempotent: on fresh envs the prior migration already created the column in
// camelCase, so this migration should be a no-op when snake_case is absent.

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

const columnExists = async (db: Kysely<any>, table: string, column: string) => {
  const result = await sql<{ name: string }>`
    SELECT name FROM pragma_table_info(${table}) WHERE name = ${column}
  `.execute(db);
  return result.rows.length > 0;
};

export const up: Migration["up"] = async (db: Kysely<any>) => {
  if (await columnExists(db, "user", "last_engagement_reminder_at")) {
    await sql`ALTER TABLE user RENAME COLUMN last_engagement_reminder_at TO lastEngagementReminderAt`.execute(db);
    console.log("✅ Renamed last_engagement_reminder_at to lastEngagementReminderAt");
  } else {
    console.log("ℹ️ last_engagement_reminder_at not present; rename is a no-op");
  }
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  if (await columnExists(db, "user", "lastEngagementReminderAt")) {
    await sql`ALTER TABLE user RENAME COLUMN lastEngagementReminderAt TO last_engagement_reminder_at`.execute(db);
    console.log("↩️ Renamed lastEngagementReminderAt back to last_engagement_reminder_at");
  } else {
    console.log("ℹ️ lastEngagementReminderAt not present; rename is a no-op");
  }
};
