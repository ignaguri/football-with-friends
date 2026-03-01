// Migration: add-primary-auth-method
// Adds primaryAuthMethod column to user table to track how the user signed up

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // Helper to check if column exists
  const columnExists = async (table: string, column: string) => {
    const result = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info(${table}) WHERE name = ${column}
    `.execute(db);
    return result.rows.length > 0;
  };

  // Add primaryAuthMethod column
  if (!(await columnExists("user", "primaryAuthMethod"))) {
    await sql`ALTER TABLE user ADD COLUMN primaryAuthMethod TEXT DEFAULT 'email'`.execute(db);
    console.log("✅ Added primaryAuthMethod column to user table");

    // Update existing phone users based on email pattern
    await sql`
      UPDATE user
      SET primaryAuthMethod = 'phone'
      WHERE email LIKE 'phone_%@football.local'
    `.execute(db);
    console.log("✅ Updated primaryAuthMethod for existing phone users");
  } else {
    console.log("⏭️  primaryAuthMethod column already exists, skipping");
  }

  console.log("✅ Migration: add-primary-auth-method completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // SQLite doesn't support DROP COLUMN directly, need to recreate table
  // For simplicity, we'll just log a warning
  console.log(
    "⚠️  SQLite doesn't support DROP COLUMN. primaryAuthMethod column will remain.",
  );
  console.log("↩️ Migration: add-primary-auth-method rolled back (no-op)");
};
