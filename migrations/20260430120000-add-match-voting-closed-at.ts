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

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // SQLite doesn't support DROP COLUMN reliably; leave nullable column in place.
  console.log("↩️ Rolled back: add-match-voting-closed-at (column remains)");
};
