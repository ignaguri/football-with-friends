// Migration: add-nationality-to-user
// Adds nationality field (ISO 3166-1 alpha-2 country code) to user table

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // Helper to check if column exists
  const columnExists = async (table: string, column: string) => {
    const result = await sql<{ name: string }>`
      PRAGMA table_info(${sql.raw(table)})
    `.execute(db);
    return result.rows.some((col: any) => col.name === column);
  };

  // Add nationality column if it doesn't exist
  if (!(await columnExists("user", "nationality"))) {
    await db.schema
      .alterTable("user")
      .addColumn("nationality", "text")
      .execute();
    console.log("✅ Added nationality column");
  } else {
    console.log("⏭️  nationality column already exists, skipping");
  }

  console.log("✅ Migration: add-nationality-to-user completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // Note: SQLite doesn't support DROP COLUMN directly
  // For SQLite, we'd need to recreate the table without this column
  // For now, we'll leave the column (it's nullable and won't break anything)
  console.log("↩️ Rolled back: Migration: add-nationality-to-user (column remains)");
};
