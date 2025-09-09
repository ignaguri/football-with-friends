// Initial schema migration - creates all tables for the football match app

import { sql } from "kysely";

import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Create locations table
  await db.schema
    .createTable("locations")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("address", "text")
    .addColumn("coordinates", "text")
    .addColumn("court_count", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("created_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updated_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .execute();

  // Create matches table
  await db.schema
    .createTable("matches")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("location_id", "text", (col) =>
      col.references("locations.id").onDelete("cascade").notNull(),
    )
    .addColumn("date", "text", (col) => col.notNull()) // YYYY-MM-DD
    .addColumn("time", "text", (col) => col.notNull()) // HH:MM
    .addColumn("status", "text", (col) => col.notNull().defaultTo("upcoming"))
    .addColumn("max_players", "integer", (col) => col.notNull().defaultTo(10))
    .addColumn("cost_per_player", "text")
    .addColumn("shirt_cost", "text")
    .addColumn("created_by_user_id", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updated_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .execute();

  // Create signups table
  await db.schema
    .createTable("signups")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("match_id", "text", (col) =>
      col.references("matches.id").onDelete("cascade").notNull(),
    )
    .addColumn("user_id", "text") // nullable for guests
    .addColumn("player_name", "text", (col) => col.notNull())
    .addColumn("player_email", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("PENDING"))
    .addColumn("signup_type", "text", (col) => col.notNull().defaultTo("self"))
    .addColumn("guest_owner_id", "text") // for guest signups
    .addColumn("added_by_user_id", "text", (col) => col.notNull())
    .addColumn("signed_up_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updated_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .execute();

  // Create match_invitations table
  await db.schema
    .createTable("match_invitations")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("match_id", "text", (col) =>
      col.references("matches.id").onDelete("cascade").notNull(),
    )
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("invited_by_user_id", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("pending"))
    .addColumn("invited_at", "text", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("responded_at", "text")
    .execute();

  // Create indexes for performance
  await db.schema
    .createIndex("matches_date_index")
    .on("matches")
    .column("date")
    .execute();

  await db.schema
    .createIndex("matches_status_index")
    .on("matches")
    .column("status")
    .execute();

  await db.schema
    .createIndex("signups_match_id_index")
    .on("signups")
    .column("match_id")
    .execute();

  await db.schema
    .createIndex("signups_user_id_index")
    .on("signups")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("signups_player_email_index")
    .on("signups")
    .column("player_email")
    .execute();

  await db.schema
    .createIndex("match_invitations_email_index")
    .on("match_invitations")
    .column("email")
    .execute();

  // Insert default location
  await db
    .insertInto("locations")
    .values({
      id: "default",
      name: "Default Court",
      address: null,
      coordinates: null,
      court_count: 1,
      created_at: sql`CURRENT_TIMESTAMP`,
      updated_at: sql`CURRENT_TIMESTAMP`,
    })
    .execute();

  console.log("✅ Initial schema created successfully");
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables in reverse order to handle foreign key constraints
  await db.schema.dropTable("match_invitations").execute();
  await db.schema.dropTable("signups").execute();
  await db.schema.dropTable("matches").execute();
  await db.schema.dropTable("locations").execute();

  console.log("↩️ Initial schema rolled back successfully");
}
