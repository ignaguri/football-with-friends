// Migration: add-username-profile-fields
// Adds username, displayUsername, and profilePicture fields to user table

import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // Add new columns to user table
  await db.schema
    .alterTable("user")
    .addColumn("username", "text")
    .execute();

  await db.schema
    .alterTable("user")
    .addColumn("displayUsername", "text")
    .execute();

  await db.schema
    .alterTable("user")
    .addColumn("profilePicture", "text")
    .execute();

  // Add unique index for username (allows null but unique when set)
  await db.schema
    .createIndex("user_username_unique")
    .unique()
    .on("user")
    .column("username")
    .execute();

  console.log("✅ Migration: add-username-profile-fields");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // Drop the unique index first
  await db.schema.dropIndex("user_username_unique").execute();

  // Note: SQLite doesn't support DROP COLUMN directly
  // For SQLite, we'd need to recreate the table without these columns
  // For now, we'll leave the columns (they're nullable and won't break anything)
  console.log("↩️ Rolled back: Migration: add-username-profile-fields (index dropped, columns remain)");
};
