// Migration: migrate-user-role
// Narrows the global `user.role` column for the post-scoping world:
//   - Every previous global 'admin' (except Ignacio) becomes a plain 'user'
//     at the platform level. They retain organizer rights inside the legacy
//     group via group_members.role, set in backfill-legacy-group.
//   - Ignacio's account stays at 'admin' — the cross-group escape hatch used
//     for impersonation-style overrides and creating new groups.
//
// This runs AFTER backfill-legacy-group, so group_members already records the
// organizer/member split we need for the down migration to reconstruct the
// original admin set.
//
// See docs/superpowers/specs/2026-04-22-group-oriented-scoping-design.md

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

const PLATFORM_ADMIN_EMAIL = "ignacioguri@gmail.com";
const LEGACY_GROUP_ID = "grp_legacy";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // Demote every previous global admin (except Ignacio) to plain user.
  // Their organizer privileges are preserved inside grp_legacy.
  const demoteResult = await db
    .updateTable("user")
    .set({ role: "user" })
    .where("role", "=", "admin")
    .where("email", "!=", PLATFORM_ADMIN_EMAIL)
    .executeTakeFirst();
  console.log(
    `✅ Demoted ${Number(demoteResult?.numUpdatedRows ?? 0)} previous admin(s) to 'user'`,
  );

  // Invariant: Ignacio must be present and must be 'admin' post-migration.
  const result = await sql<{ c: number }>`
    SELECT COUNT(*) AS c FROM user WHERE role='admin' AND email=${PLATFORM_ADMIN_EMAIL}
  `.execute(db);
  if (Number(result.rows[0]?.c ?? 0) !== 1) {
    throw new Error(
      `migrate-user-role: expected exactly 1 admin row for ${PLATFORM_ADMIN_EMAIL}, ` +
        `got ${result.rows[0]?.c ?? 0}. Has the account been created?`,
    );
  }

  const totalAdmins = await sql<{ c: number }>`
    SELECT COUNT(*) AS c FROM user WHERE role='admin'
  `.execute(db);
  if (Number(totalAdmins.rows[0]?.c ?? 0) !== 1) {
    throw new Error(
      "migrate-user-role: expected exactly 1 admin after migration, " +
        `got ${totalAdmins.rows[0]?.c ?? 0}`,
    );
  }

  console.log("✅ Migration: migrate-user-role completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // Re-elevate everyone whose membership in the legacy group was 'organizer'
  // back to the old 'admin' role. This reconstructs the pre-migration admin
  // set as long as the backfill migration is still in place.
  await db
    .updateTable("user")
    .set({ role: "admin" })
    .where((eb) =>
      eb(
        "id",
        "in",
        eb
          .selectFrom("group_members")
          .select("user_id")
          .where("group_id", "=", LEGACY_GROUP_ID)
          .where("role", "=", "organizer"),
      ),
    )
    .execute();

  console.log("↩️ Rolled back migrate-user-role — organizers of legacy group restored to 'admin'");
};
