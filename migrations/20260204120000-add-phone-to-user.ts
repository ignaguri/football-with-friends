// Migration: add-phone-to-user
// Adds phoneNumber and phoneNumberVerified columns to user table for phone authentication

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

  // Add phoneNumber column (without UNIQUE in ALTER TABLE - SQLite limitation)
  if (!(await columnExists("user", "phoneNumber"))) {
    await sql`ALTER TABLE user ADD COLUMN phoneNumber TEXT`.execute(db);
    // Create unique index instead of column constraint
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_phone_number ON user(phoneNumber) WHERE phoneNumber IS NOT NULL`.execute(
      db,
    );
    console.log("✅ Added phoneNumber column and unique index to user table");
  } else {
    console.log("⏭️  phoneNumber column already exists, skipping");
  }

  // Add phoneNumberVerified column
  if (!(await columnExists("user", "phoneNumberVerified"))) {
    await sql`ALTER TABLE user ADD COLUMN phoneNumberVerified INTEGER DEFAULT 0`.execute(db);
    console.log("✅ Added phoneNumberVerified column to user table");
  } else {
    console.log("⏭️  phoneNumberVerified column already exists, skipping");
  }

  console.log("✅ Migration: add-phone-to-user completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // SQLite doesn't support DROP COLUMN directly, need to recreate table
  // For simplicity, we'll just log a warning
  console.log("⚠️  SQLite doesn't support DROP COLUMN. Phone columns will remain.");
  console.log("↩️ Migration: add-phone-to-user rolled back (no-op)");
};
