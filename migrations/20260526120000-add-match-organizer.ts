// Migration: add-match-organizer
// Adds nullable organizer_user_id column to matches for the per-match organizer
// delegation feature. FK to user(id) is expressed in the Kysely type + enforced
// at the service layer (matches how other late-added match columns are handled).
// See docs/superpowers/specs/2026-05-25-per-match-organizer-design.md

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  const columnExists = async (table: string, column: string) => {
    const result = await sql<{ name: string }>`
      PRAGMA table_info(${sql.raw(table)})
    `.execute(db);
    return result.rows.some((col: any) => col.name === column);
  };

  if (!(await columnExists("matches", "organizer_user_id"))) {
    await db.schema.alterTable("matches").addColumn("organizer_user_id", "text").execute();
    console.log("✅ Added organizer_user_id column to matches");
  } else {
    console.log("⏭️  organizer_user_id column already exists, skipping");
  }

  console.log("✅ Migration: add-match-organizer completed");
};

export const down: Migration["down"] = async (_db: Kysely<any>) => {
  throw new Error(
    "Migration add-match-organizer is intentionally non-reversible: SQLite cannot drop a column without rebuilding the matches table. Down migration aborted so callers do not assume the prior schema was restored.",
  );
};
