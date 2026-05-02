// Migration: add-notifications-inbox
// Adds the `notifications` table that backs the per-user, per-group inbox.
// Push delivery (Expo) stays fire-and-forget; this table makes events
// readable later (especially on web where there is no push).

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

const tableExists = async (db: Kysely<any>, table: string) => {
  const result = await sql<{ name: string }>`
    SELECT name FROM sqlite_master WHERE type='table' AND name=${table}
  `.execute(db);
  return result.rows.length > 0;
};

export const up: Migration["up"] = async (db: Kysely<any>) => {
  if (!(await tableExists(db, "notifications"))) {
    await sql`
      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        category TEXT,
        title TEXT,
        body TEXT NOT NULL,
        data_json TEXT NOT NULL,
        read_at TEXT,
        created_at TEXT NOT NULL
      )
    `.execute(db);

    // Inbox listing (per user + group, newest first). Also the path used by
    // unreadCount — `WHERE read_at IS NULL` filters a small subset of the
    // already-narrowed (user_id, group_id) slice, so a separate unread index
    // would be redundant.
    await sql`CREATE INDEX idx_notifications_user_group_created ON notifications(user_id, group_id, created_at)`.execute(
      db,
    );

    // Used only by the retention prune cron. Cheap on a 10-day-windowed table.
    await sql`CREATE INDEX idx_notifications_created_at ON notifications(created_at)`.execute(db);

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
