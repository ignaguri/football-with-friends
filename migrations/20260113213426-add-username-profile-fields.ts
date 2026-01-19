// Migration: add-username-profile-fields
// Adds username, displayUsername, and profilePicture fields to user table

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

  // Helper to check if index exists
  const indexExists = async (name: string) => {
    const result = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='index' AND name=${name}
    `.execute(db);
    return result.rows.length > 0;
  };

  // Add username column if it doesn't exist
  if (!(await columnExists("user", "username"))) {
    await db.schema
      .alterTable("user")
      .addColumn("username", "text")
      .execute();
    console.log("✅ Added username column");
  } else {
    console.log("⏭️  username column already exists, skipping");
  }

  // Add displayUsername column if it doesn't exist
  if (!(await columnExists("user", "displayUsername"))) {
    await db.schema
      .alterTable("user")
      .addColumn("displayUsername", "text")
      .execute();
    console.log("✅ Added displayUsername column");
  } else {
    console.log("⏭️  displayUsername column already exists, skipping");
  }

  // Add profilePicture column if it doesn't exist
  if (!(await columnExists("user", "profilePicture"))) {
    await db.schema
      .alterTable("user")
      .addColumn("profilePicture", "text")
      .execute();
    console.log("✅ Added profilePicture column");
  } else {
    console.log("⏭️  profilePicture column already exists, skipping");
  }

  // Add unique index for username if it doesn't exist
  if (!(await indexExists("user_username_unique"))) {
    await db.schema
      .createIndex("user_username_unique")
      .unique()
      .on("user")
      .column("username")
      .execute();
    console.log("✅ Created user_username_unique index");
  } else {
    console.log("⏭️  user_username_unique index already exists, skipping");
  }

  console.log("✅ Migration: add-username-profile-fields completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // Drop the unique index first
  await db.schema.dropIndex("user_username_unique").execute();

  // Note: SQLite doesn't support DROP COLUMN directly
  // For SQLite, we'd need to recreate the table without these columns
  // For now, we'll leave the columns (they're nullable and won't break anything)
  console.log("↩️ Rolled back: Migration: add-username-profile-fields (index dropped, columns remain)");
};
