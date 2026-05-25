// Migration: add-group-join-requests
// Request-to-join queue for public groups: a non-member requests to join, a
// group organizer approves (adding membership) or rejects with a reason.
// See docs/superpowers/specs/2026-05-25-group-search-and-join-requests-design.md

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

const tableExists = async (db: Kysely<any>, table: string) => {
  const result = await sql<{ name: string }>`
    SELECT name FROM sqlite_master WHERE type='table' AND name=${table}
  `.execute(db);
  return result.rows.length > 0;
};

export const up: Migration["up"] = async (db: Kysely<any>) => {
  if (!(await tableExists(db, "group_join_requests"))) {
    await sql`
      CREATE TABLE group_join_requests (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        requested_by_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','approved','rejected')),
        decision_reason TEXT,
        decided_by_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
        decided_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);
    await sql`CREATE UNIQUE INDEX idx_gjr_one_pending_per_user_group
      ON group_join_requests(group_id, requested_by_user_id) WHERE status = 'pending'`.execute(db);
    await sql`CREATE INDEX idx_gjr_group_status ON group_join_requests(group_id, status)`.execute(db);
    console.log("✅ Created group_join_requests table");
  } else {
    console.log("⏭️  group_join_requests table already exists, skipping");
  }
  console.log("✅ Migration: add-group-join-requests completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  if (await tableExists(db, "group_join_requests")) {
    await sql`DROP TABLE group_join_requests`.execute(db);
  }
  console.log("↩️ Removed group_join_requests table");
};
