// Migration: add-user-notification-prefs
// Adds user_notification_prefs table for per-user push notification preferences
// (master + 3 categories). Absence of a row is treated as "all on" via
// COALESCE in the read query, so no backfill is required.

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  const tableExists = async (table: string) => {
    const result = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table' AND name=${table}
    `.execute(db);
    return result.rows.length > 0;
  };

  if (!(await tableExists("user_notification_prefs"))) {
    await db.schema
      .createTable("user_notification_prefs")
      .addColumn("user_id", "text", (col) => col.primaryKey().notNull())
      .addColumn("push_enabled", "integer", (col) => col.defaultTo(1).notNull())
      .addColumn("push_new_match", "integer", (col) =>
        col.defaultTo(1).notNull(),
      )
      .addColumn("push_match_reminder", "integer", (col) =>
        col.defaultTo(1).notNull(),
      )
      .addColumn("push_promo_to_confirmed", "integer", (col) =>
        col.defaultTo(1).notNull(),
      )
      .addColumn("updated_at", "text", (col) => col.notNull())
      .execute();

    console.log("✅ Created user_notification_prefs table");
  } else {
    console.log("⏭️  user_notification_prefs table already exists, skipping");
  }

  console.log("✅ Migration: add-user-notification-prefs completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  await db.schema.dropTable("user_notification_prefs").ifExists().execute();
  console.log("↩️ Dropped user_notification_prefs table");
};
