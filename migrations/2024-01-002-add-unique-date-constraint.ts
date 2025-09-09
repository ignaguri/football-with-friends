import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // Add unique constraint on date column
  await db.schema
    .createIndex("matches_date_unique")
    .on("matches")
    .column("date")
    .unique()
    .execute();

  console.log("✅ Added unique constraint on matches.date");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // Drop the unique constraint
  await db.schema.dropIndex("matches_date_unique").on("matches").execute();

  console.log("↩️ Removed unique constraint on matches.date");
};
