// Migration: add-group-creation-requests
// Platform-level table backing self-serve group creation: a user submits a
// request (name + reason); a platform admin approves (creating the group) or
// rejects it. Not group-scoped — a request has no group yet.
// See docs/superpowers/specs/2026-05-25-self-serve-group-creation-design.md

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

const tableExists = async (db: Kysely<any>, table: string) => {
  const result = await sql<{ name: string }>`
    SELECT name FROM sqlite_master WHERE type='table' AND name=${table}
  `.execute(db);
  return result.rows.length > 0;
};

export const up: Migration["up"] = async (db: Kysely<any>) => {
  if (!(await tableExists(db, "group_creation_requests"))) {
    await sql`
      CREATE TABLE group_creation_requests (
        id TEXT PRIMARY KEY,
        requested_by_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','approved','rejected')),
        decision_reason TEXT,
        decided_by_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
        decided_at TEXT,
        created_group_id TEXT REFERENCES groups(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);
    // Enforces "one pending request per user" at the DB layer (SQLite honors
    // partial unique indexes).
    await sql`CREATE UNIQUE INDEX idx_gcr_one_pending_per_user
      ON group_creation_requests(requested_by_user_id) WHERE status = 'pending'`.execute(db);
    await sql`CREATE INDEX idx_gcr_status ON group_creation_requests(status)`.execute(db);
    console.log("✅ Created group_creation_requests table");
  } else {
    console.log("⏭️  group_creation_requests table already exists, skipping");
  }
  console.log("✅ Migration: add-group-creation-requests completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  if (await tableExists(db, "group_creation_requests")) {
    await sql`DROP TABLE group_creation_requests`.execute(db);
  }
  console.log("↩️ Removed group_creation_requests table");
};
