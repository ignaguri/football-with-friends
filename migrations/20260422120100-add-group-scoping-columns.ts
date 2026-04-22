// Migration: add-group-scoping-columns
// Adds nullable `group_id` columns to the tables that will be scoped by the
// group-oriented refactor, plus a nullable `roster_id` on `signups` that will
// point into `group_roster` once legacy guest data is converted.
// Columns are nullable here so existing data stays valid. A later migration
// (Phase 1 — backfill-legacy-group) populates them and tightens to NOT NULL.
// FK constraints are enforced at the app layer because SQLite cannot add FKs
// to existing tables via ALTER.
// See docs/superpowers/specs/2026-04-22-group-oriented-scoping-design.md

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

const SCOPED_TABLES = [
  "matches",
  "locations",
  "courts",
  "signups",
  "voting_criteria",
  "match_votes",
  "match_player_stats",
] as const;

const columnExists = async (
  db: Kysely<any>,
  table: string,
  column: string,
) => {
  const result = await sql<{ name: string }>`PRAGMA table_info(${sql.raw(table)})`.execute(db);
  return result.rows.some((row) => row.name === column);
};

const indexExists = async (db: Kysely<any>, name: string) => {
  const result = await sql<{ name: string }>`
    SELECT name FROM sqlite_master WHERE type='index' AND name=${name}
  `.execute(db);
  return result.rows.length > 0;
};

export const up: Migration["up"] = async (db: Kysely<any>) => {
  for (const table of SCOPED_TABLES) {
    if (!(await columnExists(db, table, "group_id"))) {
      await db.schema
        .alterTable(table)
        .addColumn("group_id", "text")
        .execute();
      console.log(`✅ Added group_id to ${table}`);
    }

    const indexName = `idx_${table}_group_id`;
    if (!(await indexExists(db, indexName))) {
      await db.schema
        .createIndex(indexName)
        .on(table)
        .column("group_id")
        .execute();
      console.log(`✅ Created ${indexName}`);
    }
  }

  // roster_id on signups will point into group_roster for guest entries once
  // legacy guest signups are converted in Phase 4. Nullable throughout.
  if (!(await columnExists(db, "signups", "roster_id"))) {
    await db.schema
      .alterTable("signups")
      .addColumn("roster_id", "text")
      .execute();
    console.log("✅ Added roster_id to signups");
  }

  if (!(await indexExists(db, "idx_signups_roster_id"))) {
    await db.schema
      .createIndex("idx_signups_roster_id")
      .on("signups")
      .column("roster_id")
      .execute();
    console.log("✅ Created idx_signups_roster_id");
  }

  console.log("✅ Migration: add-group-scoping-columns completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // SQLite's DROP INDEX does not take a table qualifier, so we bypass Kysely's
  // schema builder (which emits `ON "<table>"` for some dialects) and use raw
  // SQL. Column drops go through Kysely since ALTER TABLE ... DROP COLUMN is
  // supported directly on SQLite 3.35+.
  if (await indexExists(db, "idx_signups_roster_id")) {
    await sql`DROP INDEX idx_signups_roster_id`.execute(db);
  }
  if (await columnExists(db, "signups", "roster_id")) {
    await db.schema.alterTable("signups").dropColumn("roster_id").execute();
  }

  for (const table of [...SCOPED_TABLES].reverse()) {
    const indexName = `idx_${table}_group_id`;
    if (await indexExists(db, indexName)) {
      await sql`DROP INDEX ${sql.raw(`"${indexName}"`)}`.execute(db);
    }
    if (await columnExists(db, table, "group_id")) {
      await db.schema.alterTable(table).dropColumn("group_id").execute();
    }
  }

  console.log("↩️ Removed group-scoping columns and indexes");
};
