// Migration: backfill-legacy-group
// Seeds a single "legacy" group that owns all pre-existing data and populates
// the group_id columns added in 20260422120100-add-group-scoping-columns.
// Also creates a group_members row for every existing user and copies the
// global `settings` rows into `group_settings` under grp_legacy.
//
// IMPORTANT: This migration fails loudly if Ignacio's account is missing —
// the legacy group needs an owner, and picking the wrong one would silently
// mis-attribute the entire dataset.
//
// See docs/superpowers/specs/2026-04-22-group-oriented-scoping-design.md

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

const LEGACY_GROUP_ID = "grp_legacy";
const LEGACY_GROUP_SLUG = "legacy";
const LEGACY_GROUP_NAME = "Fútbol con los pibes";
const OWNER_EMAIL = "ignacioguri@gmail.com";

const SCOPED_TABLES = [
  "matches",
  "locations",
  "courts",
  "signups",
  "voting_criteria",
  "match_votes",
  "match_player_stats",
] as const;

async function tableExists(db: Kysely<any>, name: string) {
  const result = await sql<{ name: string }>`
    SELECT name FROM sqlite_master WHERE type='table' AND name=${name}
  `.execute(db);
  return result.rows.length > 0;
}

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // 1. Find the legacy owner. Bail hard if not present — silently picking
  // another user would mis-attribute ownership of every existing row.
  const owner = await db
    .selectFrom("user")
    .select(["id", "role"])
    .where("email", "=", OWNER_EMAIL)
    .executeTakeFirst();

  if (!owner) {
    throw new Error(
      `backfill-legacy-group: expected user with email=${OWNER_EMAIL} but none exists. ` +
        "Create that account before running this migration.",
    );
  }

  // 2. Insert the legacy group if it doesn't already exist.
  const existingGroup = await db
    .selectFrom("groups")
    .select("id")
    .where("id", "=", LEGACY_GROUP_ID)
    .executeTakeFirst();

  if (!existingGroup) {
    await db
      .insertInto("groups")
      .values({
        id: LEGACY_GROUP_ID,
        name: LEGACY_GROUP_NAME,
        slug: LEGACY_GROUP_SLUG,
        owner_user_id: owner.id,
        visibility: "private",
      })
      .execute();
    console.log(`✅ Created legacy group (owner=${owner.id})`);
  }

  // 3. Create group_members for every user. role=organizer iff they were admin.
  // Users already in the legacy group (e.g. re-runs) are skipped via NOT IN.
  const users = await db
    .selectFrom("user")
    .select(["id", "role"])
    .execute();

  const existingMembers = await db
    .selectFrom("group_members")
    .select("user_id")
    .where("group_id", "=", LEGACY_GROUP_ID)
    .execute();
  const memberUserIds = new Set(existingMembers.map((m) => m.user_id));

  let insertedMembers = 0;
  for (const u of users) {
    if (memberUserIds.has(u.id)) continue;
    const role = u.role === "admin" ? "organizer" : "member";
    await db
      .insertInto("group_members")
      .values({
        id: `gm_${LEGACY_GROUP_ID}_${u.id}`,
        group_id: LEGACY_GROUP_ID,
        user_id: u.id,
        role,
      })
      .execute();
    insertedMembers++;
  }
  console.log(`✅ Added ${insertedMembers} user(s) to legacy group`);

  // 4. Backfill group_id on every scoped table. Only touches rows where the
  // column is still NULL, so re-runs are no-ops.
  for (const table of SCOPED_TABLES) {
    if (!(await tableExists(db, table))) continue;
    const result = await db
      .updateTable(table as any)
      .set({ group_id: LEGACY_GROUP_ID })
      .where("group_id", "is", null)
      .executeTakeFirst();
    console.log(
      `✅ Backfilled ${Number(result?.numUpdatedRows ?? 0)} row(s) on ${table}`,
    );
  }

  // 5. Copy global settings into group_settings under grp_legacy. Upsert shape
  // matches group_settings' composite PK (group_id, key).
  if (await tableExists(db, "settings")) {
    const settingRows = await db
      .selectFrom("settings")
      .select(["key", "value"])
      .execute();
    for (const row of settingRows) {
      await db
        .insertInto("group_settings")
        .values({
          group_id: LEGACY_GROUP_ID,
          key: row.key,
          value: row.value,
        })
        .onConflict((oc) =>
          oc
            .columns(["group_id", "key"])
            .doUpdateSet({ value: row.value, updated_at: new Date().toISOString() }),
        )
        .execute();
    }
    console.log(`✅ Copied ${settingRows.length} setting(s) into group_settings`);
  }

  console.log("✅ Migration: backfill-legacy-group completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // Reverse in the opposite order. We NULL out group_id on all scoped tables
  // but only where the row is still pointing at the legacy group — rows that
  // belong to real groups (if any were created after this migration ran) stay.
  for (const table of [...SCOPED_TABLES].reverse()) {
    if (!(await tableExists(db, table))) continue;
    await db
      .updateTable(table as any)
      .set({ group_id: null })
      .where("group_id", "=", LEGACY_GROUP_ID)
      .execute();
  }

  await db
    .deleteFrom("group_settings")
    .where("group_id", "=", LEGACY_GROUP_ID)
    .execute();

  await db
    .deleteFrom("group_members")
    .where("group_id", "=", LEGACY_GROUP_ID)
    .execute();

  await db.deleteFrom("groups").where("id", "=", LEGACY_GROUP_ID).execute();

  console.log("↩️ Rolled back backfill-legacy-group");
};
