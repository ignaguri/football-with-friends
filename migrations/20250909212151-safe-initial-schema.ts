// Safely create football app tables and constraints, checking for existing tables first

import { sql } from "kysely";

import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // Helper function to check if a table exists
  const tableExists = async (tableName: string): Promise<boolean> => {
    const result = await db
      .selectFrom("sqlite_master")
      .select("name")
      .where("type", "=", "table")
      .where("name", "=", tableName)
      .executeTakeFirst();
    return !!result;
  };

  // Create locations table if it doesn't exist
  if (!(await tableExists("locations"))) {
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
    console.log("✅ Created locations table");
  } else {
    console.log("⏭️  Locations table already exists, skipping");
  }

  // Create matches table if it doesn't exist
  if (!(await tableExists("matches"))) {
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
    console.log("✅ Created matches table");
  } else {
    console.log("⏭️  Matches table already exists, skipping");
  }

  // Create signups table if it doesn't exist
  if (!(await tableExists("signups"))) {
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
      .addColumn("signup_type", "text", (col) =>
        col.notNull().defaultTo("self"),
      )
      .addColumn("guest_owner_id", "text") // for guest signups
      .addColumn("added_by_user_id", "text", (col) => col.notNull())
      .addColumn("signed_up_at", "text", (col) =>
        col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
      )
      .addColumn("updated_at", "text", (col) =>
        col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
      )
      .execute();
    console.log("✅ Created signups table");
  } else {
    console.log("⏭️  Signups table already exists, skipping");
  }

  // Create match_invitations table if it doesn't exist
  if (!(await tableExists("match_invitations"))) {
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
    console.log("✅ Created match_invitations table");
  } else {
    console.log("⏭️  Match_invitations table already exists, skipping");
  }

  // Create indexes for performance (check if they exist first)
  const indexExists = async (indexName: string): Promise<boolean> => {
    const result = await db
      .selectFrom("sqlite_master")
      .select("name")
      .where("type", "=", "index")
      .where("name", "=", indexName)
      .executeTakeFirst();
    return !!result;
  };

  if (!(await indexExists("matches_date_index"))) {
    await db.schema
      .createIndex("matches_date_index")
      .on("matches")
      .column("date")
      .execute();
    console.log("✅ Created matches_date_index");
  }

  if (!(await indexExists("matches_status_index"))) {
    await db.schema
      .createIndex("matches_status_index")
      .on("matches")
      .column("status")
      .execute();
    console.log("✅ Created matches_status_index");
  }

  if (!(await indexExists("signups_match_id_index"))) {
    await db.schema
      .createIndex("signups_match_id_index")
      .on("signups")
      .column("match_id")
      .execute();
    console.log("✅ Created signups_match_id_index");
  }

  if (!(await indexExists("signups_user_id_index"))) {
    await db.schema
      .createIndex("signups_user_id_index")
      .on("signups")
      .column("user_id")
      .execute();
    console.log("✅ Created signups_user_id_index");
  }

  if (!(await indexExists("signups_player_email_index"))) {
    await db.schema
      .createIndex("signups_player_email_index")
      .on("signups")
      .column("player_email")
      .execute();
    console.log("✅ Created signups_player_email_index");
  }

  if (!(await indexExists("match_invitations_email_index"))) {
    await db.schema
      .createIndex("match_invitations_email_index")
      .on("match_invitations")
      .column("email")
      .execute();
    console.log("✅ Created match_invitations_email_index");
  }

  // Add unique constraint on matches.date if it doesn't exist
  if (!(await indexExists("matches_date_unique"))) {
    await db.schema
      .createIndex("matches_date_unique")
      .on("matches")
      .column("date")
      .unique()
      .execute();
    console.log("✅ Created unique constraint on matches.date");
  } else {
    console.log(
      "⏭️  Unique constraint on matches.date already exists, skipping",
    );
  }

  // Insert default location if it doesn't exist
  const defaultLocationExists = await db
    .selectFrom("locations")
    .select("id")
    .where("id", "=", "default")
    .executeTakeFirst();

  if (!defaultLocationExists) {
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
    console.log("✅ Inserted default location");
  } else {
    console.log("⏭️  Default location already exists, skipping");
  }

  console.log("✅ Safe initial schema migration completed successfully");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // Helper function to check if a table exists
  const tableExists = async (tableName: string): Promise<boolean> => {
    const result = await db
      .selectFrom("sqlite_master")
      .select("name")
      .where("type", "=", "table")
      .where("name", "=", tableName)
      .executeTakeFirst();
    return !!result;
  };

  // Drop indexes first
  const indexExists = async (indexName: string): Promise<boolean> => {
    const result = await db
      .selectFrom("sqlite_master")
      .select("name")
      .where("type", "=", "index")
      .where("name", "=", indexName)
      .executeTakeFirst();
    return !!result;
  };

  if (await indexExists("matches_date_unique")) {
    await db.schema.dropIndex("matches_date_unique").on("matches").execute();
    console.log("↩️ Dropped unique constraint on matches.date");
  }

  // Drop tables in reverse order to handle foreign key constraints
  if (await tableExists("match_invitations")) {
    await db.schema.dropTable("match_invitations").execute();
    console.log("↩️ Dropped match_invitations table");
  }

  if (await tableExists("signups")) {
    await db.schema.dropTable("signups").execute();
    console.log("↩️ Dropped signups table");
  }

  if (await tableExists("matches")) {
    await db.schema.dropTable("matches").execute();
    console.log("↩️ Dropped matches table");
  }

  if (await tableExists("locations")) {
    await db.schema.dropTable("locations").execute();
    console.log("↩️ Dropped locations table");
  }

  console.log("↩️ Safe initial schema rollback completed successfully");
};
