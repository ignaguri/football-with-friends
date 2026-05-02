// Migration: add-match-votes
// Adds match_votes table for storing player votes per match

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

  if (!(await tableExists("match_votes"))) {
    await db.schema
      .createTable("match_votes")
      .addColumn("id", "text", (col) => col.primaryKey().notNull())
      .addColumn("match_id", "text", (col) => col.notNull().references("matches.id"))
      .addColumn("voter_user_id", "text", (col) => col.notNull().references("user.id"))
      .addColumn("criteria_id", "text", (col) => col.notNull().references("voting_criteria.id"))
      .addColumn("voted_for_user_id", "text", (col) => col.notNull().references("user.id"))
      .addColumn("created_at", "text", (col) => col.notNull())
      .addColumn("updated_at", "text", (col) => col.notNull())
      .addUniqueConstraint("unique_vote_per_criteria", ["match_id", "voter_user_id", "criteria_id"])
      .execute();
    console.log("✅ Created match_votes table");
  } else {
    console.log("⏭️  match_votes table already exists, skipping");
  }

  console.log("✅ Migration: add-match-votes completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  await db.schema.dropTable("match_votes").ifExists().execute();
  console.log("↩️ Dropped match_votes table");
};
