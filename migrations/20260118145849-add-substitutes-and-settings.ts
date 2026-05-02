// Migration: add-substitutes-and-settings
// Adds max_substitutes and same_day_cost to matches table
// Creates settings table for app-wide configuration

import type { Kysely, Migration } from "kysely";
import { sql } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // Add max_substitutes column to matches table (default 2)
  await db.schema
    .alterTable("matches")
    .addColumn("max_substitutes", "integer", (col) => col.defaultTo(2).notNull())
    .execute();

  // Add same_day_cost column to matches table
  await db.schema.alterTable("matches").addColumn("same_day_cost", "text").execute();

  // Create settings table
  await db.schema
    .createTable("settings")
    .ifNotExists()
    .addColumn("key", "text", (col) => col.primaryKey())
    .addColumn("value", "text", (col) => col.notNull())
    .addColumn("updated_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Insert default settings
  await db
    .insertInto("settings")
    .values([
      { key: "default_cost_per_player", value: "10" },
      { key: "same_day_extra_cost", value: "2" },
      { key: "default_max_substitutes", value: "2" },
      { key: "paypal_url", value: "" },
      { key: "organizer_whatsapp", value: "" },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  console.log("✅ Migration: add-substitutes-and-settings");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // Drop settings table
  await db.schema.dropTable("settings").ifExists().execute();

  // Note: SQLite doesn't support DROP COLUMN directly
  // The columns will remain but are not used by the application
  console.log(
    "↩️ Rolled back: Migration: add-substitutes-and-settings (settings table dropped, columns remain)",
  );
};
