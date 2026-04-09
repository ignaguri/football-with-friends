// Migration: add-push-tokens
// Adds push_tokens table for storing device push notification tokens

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // Helper to check if table exists
  const tableExists = async (table: string) => {
    const result = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table' AND name=${table}
    `.execute(db);
    return result.rows.length > 0;
  };

  if (!(await tableExists("push_tokens"))) {
    await db.schema
      .createTable("push_tokens")
      .addColumn("id", "text", (col) => col.primaryKey().notNull())
      .addColumn("user_id", "text", (col) => col.notNull())
      .addColumn("token", "text", (col) => col.notNull().unique())
      .addColumn("platform", "text", (col) => col.notNull())
      .addColumn("device_id", "text")
      .addColumn("active", "integer", (col) => col.defaultTo(1).notNull())
      .addColumn("created_at", "text", (col) => col.notNull())
      .addColumn("updated_at", "text", (col) => col.notNull())
      .execute();

    // Index for fast user lookups
    await db.schema
      .createIndex("idx_push_tokens_user_id")
      .on("push_tokens")
      .column("user_id")
      .execute();

    console.log("✅ Created push_tokens table");
  } else {
    console.log("⏭️  push_tokens table already exists, skipping");
  }

  console.log("✅ Migration: add-push-tokens completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  await db.schema.dropTable("push_tokens").ifExists().execute();
  console.log("↩️ Dropped push_tokens table");
};
