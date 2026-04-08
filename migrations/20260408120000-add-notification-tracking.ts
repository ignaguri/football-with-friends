// Migration: add-notification-tracking
// Adds reminder_sent to matches and lastEngagementReminderAt to user

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

const columnExists = async (db: Kysely<any>, table: string, column: string) => {
  const result = await sql<{ name: string }>`
    SELECT name FROM pragma_table_info(${table}) WHERE name = ${column}
  `.execute(db);
  return result.rows.length > 0;
};

export const up: Migration["up"] = async (db: Kysely<any>) => {
  if (!(await columnExists(db, "matches", "reminder_sent"))) {
    await sql`ALTER TABLE matches ADD COLUMN reminder_sent INTEGER NOT NULL DEFAULT 0`.execute(db);
    console.log("✅ Added reminder_sent column to matches");
  }

  if (!(await columnExists(db, "user", "lastEngagementReminderAt"))) {
    await sql`ALTER TABLE user ADD COLUMN lastEngagementReminderAt TEXT`.execute(db);
    console.log("✅ Added lastEngagementReminderAt column to user");
  }

  console.log("✅ Migration: add-notification-tracking completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // SQLite doesn't support DROP COLUMN before 3.35.0, but Turso supports it
  if (await columnExists(db, "matches", "reminder_sent")) {
    await sql`ALTER TABLE matches DROP COLUMN reminder_sent`.execute(db);
  }
  if (await columnExists(db, "user", "lastEngagementReminderAt")) {
    await sql`ALTER TABLE user DROP COLUMN lastEngagementReminderAt`.execute(db);
  }
  console.log("↩️ Removed notification tracking columns");
};
