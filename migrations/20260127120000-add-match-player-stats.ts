// Migration: add-match-player-stats
// Adds match_player_stats table for tracking goals and 3° tiempo per match per player

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

  if (!(await tableExists("match_player_stats"))) {
    await db.schema
      .createTable("match_player_stats")
      .addColumn("id", "text", (col) => col.primaryKey().notNull())
      .addColumn("match_id", "text", (col) =>
        col.notNull().references("matches.id"),
      )
      .addColumn("user_id", "text", (col) =>
        col.notNull().references("user.id"),
      )
      .addColumn("goals", "integer", (col) => col.defaultTo(0).notNull())
      .addColumn("third_time_attended", "integer", (col) =>
        col.defaultTo(0).notNull(),
      )
      .addColumn("third_time_beers", "integer", (col) =>
        col.defaultTo(0).notNull(),
      )
      .addColumn("confirmed", "integer", (col) =>
        col.defaultTo(0).notNull(),
      )
      .addColumn("created_at", "text", (col) => col.notNull())
      .addColumn("updated_at", "text", (col) => col.notNull())
      .addUniqueConstraint("unique_match_user_stats", [
        "match_id",
        "user_id",
      ])
      .execute();
    console.log("✅ Created match_player_stats table");
  } else {
    console.log("⏭️  match_player_stats table already exists, skipping");
  }

  console.log("✅ Migration: add-match-player-stats completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  await db.schema.dropTable("match_player_stats").ifExists().execute();
  console.log("↩️ Dropped match_player_stats table");
};
