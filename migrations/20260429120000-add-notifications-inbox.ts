// Migration: add-notifications-inbox
// Adds the `notifications` table that backs the per-user, per-group inbox.
// Push delivery (Expo) stays fire-and-forget; this table makes events
// readable later (especially on web where there is no push).

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  const tableExists = async (table: string) => {
    const result = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table' AND name=${table}
    `.execute(db);
    return result.rows.length > 0;
  };

  if (!(await tableExists("notifications"))) {
    await db.schema
      .createTable("notifications")
      .addColumn("id", "text", (col) => col.primaryKey().notNull())
      .addColumn("user_id", "text", (col) => col.notNull())
      .addColumn("group_id", "text", (col) => col.notNull())
      .addColumn("type", "text", (col) => col.notNull())
      .addColumn("category", "text")
      .addColumn("title", "text")
      .addColumn("body", "text", (col) => col.notNull())
      .addColumn("data_json", "text", (col) => col.notNull())
      .addColumn("read_at", "text")
      .addColumn("created_at", "text", (col) => col.notNull())
      .execute();

    await db.schema
      .createIndex("idx_notifications_user_group_created")
      .on("notifications")
      .columns(["user_id", "group_id", "created_at"])
      .execute();

    await db.schema
      .createIndex("idx_notifications_user_unread")
      .on("notifications")
      .columns(["user_id", "read_at"])
      .execute();

    await db.schema
      .createIndex("idx_notifications_created_at")
      .on("notifications")
      .column("created_at")
      .execute();

    console.log("✅ Created notifications table + indexes");
  } else {
    console.log("⏭️  notifications table already exists, skipping");
  }

  console.log("✅ Migration: add-notifications-inbox completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  await db.schema.dropTable("notifications").ifExists().execute();
  console.log("↩️ Dropped notifications table");
};
