// Add courts table and court_id to matches

import { sql } from "kysely";

import type { ExtendedDatabase } from "@/lib/database/schema";
import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<ExtendedDatabase>) => {
  // Create courts table
  await db.schema
    .createTable("courts")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("location_id", "text", (col) => col.notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("is_active", "boolean", (col) => col.defaultTo(true).notNull())
    .addColumn("created_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updated_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addForeignKeyConstraint(
      "courts_location_id_fk",
      ["location_id"],
      "locations",
      ["id"],
      (cb) => cb.onDelete("cascade"),
    )
    .execute();

  // Add court_id column to matches table
  await db.schema.alterTable("matches").addColumn("court_id", "text").execute();

  // Note: SQLite doesn't support adding foreign key constraints to existing tables
  // The foreign key constraint will be enforced at the application level

  // Create indexes for performance
  await db.schema
    .createIndex("courts_location_id_idx")
    .on("courts")
    .column("location_id")
    .execute();

  await db.schema
    .createIndex("courts_is_active_idx")
    .on("courts")
    .column("is_active")
    .execute();

  await db.schema
    .createIndex("matches_court_id_idx")
    .on("matches")
    .column("court_id")
    .execute();

  // Create default courts for existing locations based on court_count
  const locations = await db
    .selectFrom("locations")
    .select(["id", "name", "court_count"])
    .execute();

  for (const location of locations) {
    for (let i = 1; i <= location.court_count; i++) {
      const courtId = `${location.id}-court-${i}`;
      const courtName = `Court ${i}`;

      await db
        .insertInto("courts")
        .values({
          id: courtId,
          location_id: location.id,
          name: courtName,
          description: `${courtName} at ${location.name}`,
          is_active: true,
          created_at: sql`CURRENT_TIMESTAMP`,
          updated_at: sql`CURRENT_TIMESTAMP`,
        })
        .execute();
    }
  }

  console.log("✅ Courts table and court_id column added successfully");
};

export const down: Migration["down"] = async (db: Kysely<ExtendedDatabase>) => {
  // Drop indexes
  await db.schema.dropIndex("matches_court_id_idx").on("matches").execute();
  await db.schema.dropIndex("courts_is_active_idx").on("courts").execute();
  await db.schema.dropIndex("courts_location_id_idx").on("courts").execute();

  // Drop court_id column from matches
  await db.schema.alterTable("matches").dropColumn("court_id").execute();

  // Drop courts table
  await db.schema.dropTable("courts").execute();

  console.log("↩️ Courts table and court_id column removed successfully");
};
