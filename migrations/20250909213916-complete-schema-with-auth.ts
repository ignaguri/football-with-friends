// Migration: complete-schema-with-auth

import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // Helper function to check if table exists
  const tableExists = async (tableName: string): Promise<boolean> => {
    const result = await db
      .selectFrom("sqlite_master")
      .select("name")
      .where("type", "=", "table")
      .where("name", "=", tableName)
      .executeTakeFirst();
    return !!result;
  };

  // Helper function to check if index exists
  const indexExists = async (indexName: string): Promise<boolean> => {
    const result = await db
      .selectFrom("sqlite_master")
      .select("name")
      .where("type", "=", "index")
      .where("name", "=", indexName)
      .executeTakeFirst();
    return !!result;
  };

  console.log("🚀 Creating complete schema with auth tables...");

  // === BETTER AUTH TABLES ===

  // User table
  if (!(await tableExists("user"))) {
    await db.schema
      .createTable("user")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("name", "text")
      .addColumn("email", "text", (col) => col.notNull().unique())
      .addColumn("emailVerified", "integer", (col) =>
        col.notNull().defaultTo(0),
      )
      .addColumn("image", "text")
      .addColumn("role", "text", (col) => col.notNull().defaultTo("user"))
      .addColumn("banned", "integer")
      .addColumn("banReason", "text")
      .addColumn("banExpires", "date")
      .addColumn("createdAt", "integer", (col) => col.notNull())
      .addColumn("updatedAt", "integer", (col) => col.notNull())
      .execute();
    console.log("✅ Created user table");
  } else {
    console.log("⏭️  User table already exists, skipping");
  }

  // Account table
  if (!(await tableExists("account"))) {
    await db.schema
      .createTable("account")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("userId", "text", (col) =>
        col.notNull().references("user.id").onDelete("cascade"),
      )
      .addColumn("accountId", "text", (col) => col.notNull())
      .addColumn("providerId", "text", (col) => col.notNull())
      .addColumn("accessToken", "text")
      .addColumn("refreshToken", "text")
      .addColumn("idToken", "text")
      .addColumn("accessTokenExpiresAt", "integer")
      .addColumn("refreshTokenExpiresAt", "integer")
      .addColumn("scope", "text")
      .addColumn("password", "text")
      .addColumn("createdAt", "integer", (col) => col.notNull())
      .addColumn("updatedAt", "integer", (col) => col.notNull())
      .execute();
    console.log("✅ Created account table");
  } else {
    console.log("⏭️  Account table already exists, skipping");
  }

  // Session table
  if (!(await tableExists("session"))) {
    await db.schema
      .createTable("session")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("expiresAt", "integer", (col) => col.notNull())
      .addColumn("token", "text", (col) => col.notNull().unique())
      .addColumn("createdAt", "integer", (col) => col.notNull())
      .addColumn("updatedAt", "integer", (col) => col.notNull())
      .addColumn("ipAddress", "text")
      .addColumn("userAgent", "text")
      .addColumn("userId", "text", (col) =>
        col.notNull().references("user.id").onDelete("cascade"),
      )
      .addColumn("impersonatedBy", "text")
      .execute();
    console.log("✅ Created session table");
  } else {
    console.log("⏭️  Session table already exists, skipping");
  }

  // Verification table
  if (!(await tableExists("verification"))) {
    await db.schema
      .createTable("verification")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("identifier", "text", (col) => col.notNull())
      .addColumn("value", "text", (col) => col.notNull())
      .addColumn("expiresAt", "integer", (col) => col.notNull())
      .addColumn("createdAt", "integer", (col) => col.notNull())
      .addColumn("updatedAt", "integer", (col) => col.notNull())
      .execute();
    console.log("✅ Created verification table");
  } else {
    console.log("⏭️  Verification table already exists, skipping");
  }

  // === FOOTBALL APP TABLES ===

  // Locations table
  if (!(await tableExists("locations"))) {
    await db.schema
      .createTable("locations")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("address", "text")
      .addColumn("coordinates", "text")
      .addColumn("court_count", "integer", (col) => col.notNull().defaultTo(1))
      .addColumn("created_at", "text", (col) =>
        col.defaultTo("CURRENT_TIMESTAMP").notNull(),
      )
      .addColumn("updated_at", "text", (col) =>
        col.defaultTo("CURRENT_TIMESTAMP").notNull(),
      )
      .execute();
    console.log("✅ Created locations table");
  } else {
    console.log("⏭️  Locations table already exists, skipping");
  }

  // Matches table
  if (!(await tableExists("matches"))) {
    await db.schema
      .createTable("matches")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("location_id", "text", (col) =>
        col.notNull().references("locations.id").onDelete("cascade"),
      )
      .addColumn("date", "text", (col) => col.notNull())
      .addColumn("time", "text", (col) => col.notNull())
      .addColumn("status", "text", (col) => col.notNull().defaultTo("upcoming"))
      .addColumn("max_players", "integer", (col) => col.notNull().defaultTo(10))
      .addColumn("cost_per_player", "text")
      .addColumn("shirt_cost", "text")
      .addColumn("created_by_user_id", "text", (col) => col.notNull())
      .addColumn("created_at", "text", (col) =>
        col.defaultTo("CURRENT_TIMESTAMP").notNull(),
      )
      .addColumn("updated_at", "text", (col) =>
        col.defaultTo("CURRENT_TIMESTAMP").notNull(),
      )
      .execute();
    console.log("✅ Created matches table");
  } else {
    console.log("⏭️  Matches table already exists, skipping");
  }

  // Signups table
  if (!(await tableExists("signups"))) {
    await db.schema
      .createTable("signups")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("match_id", "text", (col) =>
        col.notNull().references("matches.id").onDelete("cascade"),
      )
      .addColumn("user_id", "text")
      .addColumn("player_name", "text", (col) => col.notNull())
      .addColumn("player_email", "text", (col) => col.notNull())
      .addColumn("status", "text", (col) => col.notNull().defaultTo("PENDING"))
      .addColumn("signup_type", "text", (col) =>
        col.notNull().defaultTo("self"),
      )
      .addColumn("guest_owner_id", "text")
      .addColumn("added_by_user_id", "text", (col) => col.notNull())
      .addColumn("signed_up_at", "text", (col) =>
        col.defaultTo("CURRENT_TIMESTAMP").notNull(),
      )
      .addColumn("updated_at", "text", (col) =>
        col.defaultTo("CURRENT_TIMESTAMP").notNull(),
      )
      .execute();
    console.log("✅ Created signups table");
  } else {
    console.log("⏭️  Signups table already exists, skipping");
  }

  // Match invitations table
  if (!(await tableExists("match_invitations"))) {
    await db.schema
      .createTable("match_invitations")
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("match_id", "text", (col) =>
        col.notNull().references("matches.id").onDelete("cascade"),
      )
      .addColumn("email", "text", (col) => col.notNull())
      .addColumn("invited_by_user_id", "text", (col) => col.notNull())
      .addColumn("status", "text", (col) => col.notNull().defaultTo("pending"))
      .addColumn("invited_at", "text", (col) =>
        col.defaultTo("CURRENT_TIMESTAMP").notNull(),
      )
      .addColumn("responded_at", "text")
      .execute();
    console.log("✅ Created match_invitations table");
  } else {
    console.log("⏭️  Match_invitations table already exists, skipping");
  }

  // === INDEXES ===

  // Matches indexes
  if (!(await indexExists("matches_date_index"))) {
    await db.schema
      .createIndex("matches_date_index")
      .on("matches")
      .column("date")
      .execute();
    console.log("✅ Created matches_date_index");
  } else {
    console.log("⏭️  Matches_date_index already exists, skipping");
  }

  if (!(await indexExists("matches_status_index"))) {
    await db.schema
      .createIndex("matches_status_index")
      .on("matches")
      .column("status")
      .execute();
    console.log("✅ Created matches_status_index");
  } else {
    console.log("⏭️  Matches_status_index already exists, skipping");
  }

  // Signups indexes
  if (!(await indexExists("signups_match_id_index"))) {
    await db.schema
      .createIndex("signups_match_id_index")
      .on("signups")
      .column("match_id")
      .execute();
    console.log("✅ Created signups_match_id_index");
  } else {
    console.log("⏭️  Signups_match_id_index already exists, skipping");
  }

  if (!(await indexExists("signups_user_id_index"))) {
    await db.schema
      .createIndex("signups_user_id_index")
      .on("signups")
      .column("user_id")
      .execute();
    console.log("✅ Created signups_user_id_index");
  } else {
    console.log("⏭️  Signups_user_id_index already exists, skipping");
  }

  if (!(await indexExists("signups_player_email_index"))) {
    await db.schema
      .createIndex("signups_player_email_index")
      .on("signups")
      .column("player_email")
      .execute();
    console.log("✅ Created signups_player_email_index");
  } else {
    console.log("⏭️  Signups_player_email_index already exists, skipping");
  }

  // Match invitations indexes
  if (!(await indexExists("match_invitations_email_index"))) {
    await db.schema
      .createIndex("match_invitations_email_index")
      .on("match_invitations")
      .column("email")
      .execute();
    console.log("✅ Created match_invitations_email_index");
  } else {
    console.log("⏭️  Match_invitations_email_index already exists, skipping");
  }

  // === CONSTRAINTS ===

  // Unique constraint on matches.date
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

  // === DEFAULT DATA ===

  // Insert default location if it doesn't exist
  const defaultLocationExists = await db
    .selectFrom("locations")
    .select("id")
    .where("id", "=", "default-location")
    .executeTakeFirst();

  if (!defaultLocationExists) {
    await db
      .insertInto("locations")
      .values({
        id: "default-location",
        name: "Default Court",
        address: "TBD",
        coordinates: null,
        court_count: 1,
      })
      .execute();
    console.log("✅ Inserted default location");
  } else {
    console.log("⏭️  Default location already exists, skipping");
  }

  console.log("✅ Complete schema migration completed successfully");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // Helper function to check if table exists
  const tableExists = async (tableName: string): Promise<boolean> => {
    const result = await db
      .selectFrom("sqlite_master")
      .select("name")
      .where("type", "=", "table")
      .where("name", "=", tableName)
      .executeTakeFirst();
    return !!result;
  };

  // Helper function to check if index exists
  const indexExists = async (indexName: string): Promise<boolean> => {
    const result = await db
      .selectFrom("sqlite_master")
      .select("name")
      .where("type", "=", "index")
      .where("name", "=", indexName)
      .executeTakeFirst();
    return !!result;
  };

  console.log("🔄 Rolling back complete schema migration...");

  // Drop indexes first
  if (await indexExists("matches_date_unique")) {
    await db.schema.dropIndex("matches_date_unique").execute();
    console.log("✅ Dropped matches_date_unique");
  }

  if (await indexExists("match_invitations_email_index")) {
    await db.schema.dropIndex("match_invitations_email_index").execute();
    console.log("✅ Dropped match_invitations_email_index");
  }

  if (await indexExists("signups_player_email_index")) {
    await db.schema.dropIndex("signups_player_email_index").execute();
    console.log("✅ Dropped signups_player_email_index");
  }

  if (await indexExists("signups_user_id_index")) {
    await db.schema.dropIndex("signups_user_id_index").execute();
    console.log("✅ Dropped signups_user_id_index");
  }

  if (await indexExists("signups_match_id_index")) {
    await db.schema.dropIndex("signups_match_id_index").execute();
    console.log("✅ Dropped signups_match_id_index");
  }

  if (await indexExists("matches_status_index")) {
    await db.schema.dropIndex("matches_status_index").execute();
    console.log("✅ Dropped matches_status_index");
  }

  if (await indexExists("matches_date_index")) {
    await db.schema.dropIndex("matches_date_index").execute();
    console.log("✅ Dropped matches_date_index");
  }

  // Drop tables in reverse order (respecting foreign key constraints)
  if (await tableExists("match_invitations")) {
    await db.schema.dropTable("match_invitations").execute();
    console.log("✅ Dropped match_invitations table");
  }

  if (await tableExists("signups")) {
    await db.schema.dropTable("signups").execute();
    console.log("✅ Dropped signups table");
  }

  if (await tableExists("matches")) {
    await db.schema.dropTable("matches").execute();
    console.log("✅ Dropped matches table");
  }

  if (await tableExists("locations")) {
    await db.schema.dropTable("locations").execute();
    console.log("✅ Dropped locations table");
  }

  // Drop auth tables
  if (await tableExists("verification")) {
    await db.schema.dropTable("verification").execute();
    console.log("✅ Dropped verification table");
  }

  if (await tableExists("session")) {
    await db.schema.dropTable("session").execute();
    console.log("✅ Dropped session table");
  }

  if (await tableExists("account")) {
    await db.schema.dropTable("account").execute();
    console.log("✅ Dropped account table");
  }

  if (await tableExists("user")) {
    await db.schema.dropTable("user").execute();
    console.log("✅ Dropped user table");
  }

  console.log("✅ Complete schema rollback completed successfully");
};
