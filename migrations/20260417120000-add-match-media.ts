// Migration: add-match-media
// Adds match_media and match_media_reaction tables for the multimedia feature.

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

const tableExists = async (db: Kysely<any>, table: string) => {
  const result = await sql<{ name: string }>`
    SELECT name FROM sqlite_master WHERE type='table' AND name=${table}
  `.execute(db);
  return result.rows.length > 0;
};

export const up: Migration["up"] = async (db: Kysely<any>) => {
  if (!(await tableExists(db, "match_media"))) {
    await sql`
      CREATE TABLE match_media (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        uploader_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('photo', 'video')),
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        caption TEXT,
        r2_key TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);
    await sql`CREATE INDEX idx_match_media_match_created ON match_media(match_id, created_at DESC)`.execute(
      db,
    );
    await sql`CREATE INDEX idx_match_media_uploader ON match_media(uploader_user_id)`.execute(db);
    console.log("✅ Created match_media table and indexes");
  }

  if (!(await tableExists(db, "match_media_reaction"))) {
    await sql`
      CREATE TABLE match_media_reaction (
        media_id TEXT NOT NULL REFERENCES match_media(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        emoji TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (media_id, user_id, emoji)
      )
    `.execute(db);
    console.log("✅ Created match_media_reaction table");
  }

  console.log("✅ Migration: add-match-media completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  if (await tableExists(db, "match_media_reaction")) {
    await sql`DROP TABLE match_media_reaction`.execute(db);
  }
  if (await tableExists(db, "match_media")) {
    await sql`DROP TABLE match_media`.execute(db);
  }
  console.log("↩️ Removed match_media tables");
};
