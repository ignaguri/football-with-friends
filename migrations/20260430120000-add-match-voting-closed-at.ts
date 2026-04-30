// Migration: add-match-voting-closed-at
// Adds nullable voting_closed_at column to matches table for organizer-driven manual close.

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  const columnExists = async (table: string, column: string) => {
    const result = await sql<{ name: string }>`
      PRAGMA table_info(${sql.raw(table)})
    `.execute(db);
    return result.rows.some((col: any) => col.name === column);
  };

  if (!(await columnExists("matches", "voting_closed_at"))) {
    await db.schema
      .alterTable("matches")
      .addColumn("voting_closed_at", "text")
      .execute();
    console.log("✅ Added voting_closed_at column to matches");
  } else {
    console.log("⏭️  voting_closed_at column already exists, skipping");
  }

  console.log("✅ Migration: add-match-voting-closed-at completed");
};

export const down: Migration["down"] = async (_db: Kysely<any>) => {
  throw new Error(
    "Migration add-match-voting-closed-at is intentionally non-reversible: SQLite cannot drop a column without rebuilding the matches table. Down migration aborted so callers do not assume the prior schema was restored.",
  );
};
