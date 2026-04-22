// Migration: create-group-tables
// Adds groups, group_members, group_invites, group_roster, and group_settings
// tables as the foundation for the group-oriented scoping refactor.
// See docs/superpowers/specs/2026-04-22-group-oriented-scoping-design.md

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

const tableExists = async (db: Kysely<any>, table: string) => {
  const result = await sql<{ name: string }>`
    SELECT name FROM sqlite_master WHERE type='table' AND name=${table}
  `.execute(db);
  return result.rows.length > 0;
};

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // groups
  if (!(await tableExists(db, "groups"))) {
    await sql`
      CREATE TABLE groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        owner_user_id TEXT NOT NULL REFERENCES user(id),
        visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
        deleted_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);
    await sql`CREATE INDEX idx_groups_owner ON groups(owner_user_id)`.execute(db);
    await sql`CREATE INDEX idx_groups_visibility ON groups(visibility) WHERE deleted_at IS NULL`.execute(db);
    console.log("✅ Created groups table");
  }

  // group_members
  if (!(await tableExists(db, "group_members"))) {
    await sql`
      CREATE TABLE group_members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('organizer','member')),
        joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (group_id, user_id)
      )
    `.execute(db);
    await sql`CREATE INDEX idx_group_members_user ON group_members(user_id)`.execute(db);
    await sql`CREATE INDEX idx_group_members_group_role ON group_members(group_id, role)`.execute(db);
    console.log("✅ Created group_members table");
  }

  // group_invites
  if (!(await tableExists(db, "group_invites"))) {
    await sql`
      CREATE TABLE group_invites (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        created_by_user_id TEXT NOT NULL REFERENCES user(id),
        expires_at TEXT,
        max_uses INTEGER,
        uses_count INTEGER NOT NULL DEFAULT 0,
        target_phone TEXT,
        target_user_id TEXT REFERENCES user(id),
        revoked_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);
    await sql`CREATE INDEX idx_group_invites_group_active ON group_invites(group_id, revoked_at)`.execute(db);
    await sql`CREATE INDEX idx_group_invites_target_user ON group_invites(target_user_id) WHERE target_user_id IS NOT NULL`.execute(db);
    console.log("✅ Created group_invites table");
  }

  // group_roster (ghosts + claimed ghosts)
  if (!(await tableExists(db, "group_roster"))) {
    await sql`
      CREATE TABLE group_roster (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        display_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        claimed_by_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
        created_by_user_id TEXT NOT NULL REFERENCES user(id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);
    // Auto-claim lookups hit (group_id, phone) / (group_id, email); partial indexes
    // skip rows without the lookup key.
    await sql`CREATE INDEX idx_group_roster_group_phone ON group_roster(group_id, phone) WHERE phone IS NOT NULL`.execute(db);
    await sql`CREATE INDEX idx_group_roster_group_email ON group_roster(group_id, email) WHERE email IS NOT NULL`.execute(db);
    await sql`CREATE INDEX idx_group_roster_claimed_user ON group_roster(claimed_by_user_id) WHERE claimed_by_user_id IS NOT NULL`.execute(db);
    console.log("✅ Created group_roster table");
  }

  // group_settings (EAV; mirrors the shape of the existing global settings table)
  if (!(await tableExists(db, "group_settings"))) {
    await sql`
      CREATE TABLE group_settings (
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (group_id, key)
      )
    `.execute(db);
    console.log("✅ Created group_settings table");
  }

  console.log("✅ Migration: create-group-tables completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // Drop in reverse dependency order. Indexes are dropped automatically with
  // their tables in SQLite, so we only need DROP TABLE calls.
  for (const table of [
    "group_settings",
    "group_roster",
    "group_invites",
    "group_members",
    "groups",
  ]) {
    if (await tableExists(db, table)) {
      await sql`DROP TABLE ${sql.raw(table)}`.execute(db);
    }
  }
  console.log("↩️ Removed group-related tables");
};
