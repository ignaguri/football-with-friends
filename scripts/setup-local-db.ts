#!/usr/bin/env tsx
// Setup local database with BetterAuth tables

// Load environment variables first
import "dotenv/config";

import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely } from "kysely";

// Define database schema type
interface Database {
  user: {
    id: string;
    name: string | null;
    email: string;
    emailVerified: number;
    image: string | null;
    role: string;
    banned: number | null;
    banReason: string | null;
    banExpires: string | null;
    createdAt: number;
    updatedAt: number;
  };
  account: {
    id: string;
    userId: string;
    accountId: string;
    providerId: string;
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
    accessTokenExpiresAt: number | null;
    refreshTokenExpiresAt: number | null;
    scope: string | null;
    password: string | null;
    createdAt: number;
    updatedAt: number;
  };
  session: {
    id: string;
    expiresAt: number;
    token: string;
    createdAt: number;
    updatedAt: number;
    ipAddress: string | null;
    userAgent: string | null;
    userId: string;
    impersonatedBy: string | null;
  };
  verification: {
    id: string;
    identifier: string;
    value: string;
    expiresAt: number;
    createdAt: number;
    updatedAt: number;
  };
  locations: {
    id: string;
    name: string;
    address: string | null;
    coordinates: string | null;
    court_count: number;
    created_at: string;
    updated_at: string;
  };
  matches: {
    id: string;
    location_id: string;
    date: string;
    time: string;
    status: string;
    max_players: number;
    cost_per_player: string | null;
    shirt_cost: string | null;
    created_by_user_id: string;
    created_at: string;
    updated_at: string;
  };
  signups: {
    id: string;
    match_id: string;
    user_id: string | null;
    player_name: string;
    player_email: string;
    status: string;
    signup_type: string;
    guest_owner_id: string | null;
    added_by_user_id: string;
    signed_up_at: string;
    updated_at: string;
  };
  match_invitations: {
    id: string;
    match_id: string;
    email: string;
    invited_by_user_id: string;
    status: string;
    invited_at: string;
    responded_at: string | null;
  };
}

// Create database connection
const db = new Kysely<Database>({
  dialect: new LibsqlDialect({
    url: process.env.LOCAL_DATABASE_URL || "file:./local.db",
  }),
});

async function setupDatabase() {
  console.log("🚀 Setting up local database...");

  try {
    // Create BetterAuth tables
    console.log("📋 Creating BetterAuth tables...");

    // User table
    await db.schema
      .createTable("user")
      .ifNotExists()
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

    // Account table
    await db.schema
      .createTable("account")
      .ifNotExists()
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

    // Session table
    await db.schema
      .createTable("session")
      .ifNotExists()
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

    // Verification table
    await db.schema
      .createTable("verification")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("identifier", "text", (col) => col.notNull())
      .addColumn("value", "text", (col) => col.notNull())
      .addColumn("expiresAt", "integer", (col) => col.notNull())
      .addColumn("createdAt", "integer", (col) => col.notNull())
      .addColumn("updatedAt", "integer", (col) => col.notNull())
      .execute();

    // Create app-specific tables
    console.log("📋 Creating app-specific tables...");

    // Locations table
    await db.schema
      .createTable("locations")
      .ifNotExists()
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

    // Matches table
    await db.schema
      .createTable("matches")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("location_id", "text", (col) =>
        col.references("locations.id").onDelete("cascade").notNull(),
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

    // Signups table
    await db.schema
      .createTable("signups")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("match_id", "text", (col) =>
        col.references("matches.id").onDelete("cascade").notNull(),
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

    // Match invitations table
    await db.schema
      .createTable("match_invitations")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("match_id", "text", (col) =>
        col.references("matches.id").onDelete("cascade").notNull(),
      )
      .addColumn("email", "text", (col) => col.notNull())
      .addColumn("invited_by_user_id", "text", (col) => col.notNull())
      .addColumn("status", "text", (col) => col.notNull().defaultTo("pending"))
      .addColumn("invited_at", "text", (col) =>
        col.defaultTo("CURRENT_TIMESTAMP").notNull(),
      )
      .addColumn("responded_at", "text")
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
        created_at: "CURRENT_TIMESTAMP",
        updated_at: "CURRENT_TIMESTAMP",
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();

    console.log("✅ Database setup completed successfully!");
    console.log(
      "📊 Created tables: user (with role, banned, banReason, banExpires), account, session (with impersonatedBy), verification, locations, matches, signups, match_invitations",
    );
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    throw error;
  } finally {
    await db.destroy();
  }
}

setupDatabase().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
