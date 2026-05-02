// Migration: convert-legacy-guests-to-ghosts
// For every legacy no-user signup in grp_legacy — identified by
// `signups.user_id IS NULL AND roster_id IS NULL` — create a corresponding
// `group_roster` entry (deduplicated per `(owner_id, player_name)` tuple,
// where owner_id = COALESCE(guest_owner_id, added_by_user_id)) and point
// `signups.roster_id` at it. Covers both `guest` signups and `admin_added`
// signups that don't link to a real user. `guest_owner_id` is retained as
// an audit column.
//
// Idempotency: existence checks on both the ghost insert and the signup
// update let this migration be re-run safely. The down migration undoes
// the signup link and deletes the ghosts we produced; we identify them via
// `phone IS NULL AND email IS NULL AND group_id = 'grp_legacy'` plus
// matching `(display_name, created_by_user_id)` — guests migrated from
// legacy data never carry contact info.

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";
import { randomBytes } from "node:crypto";

const LEGACY_GROUP_ID = "grp_legacy";

function newRosterId(): string {
  return `rst_${randomBytes(8).toString("hex")}`;
}

export const up: Migration["up"] = async (db: Kysely<any>) => {
  const legacyGuests = await db
    .selectFrom("signups")
    .select((eb) => [
      eb.fn.coalesce("guest_owner_id", "added_by_user_id").as("owner_id"),
      "player_name",
    ])
    .where("user_id", "is", null)
    .where("roster_id", "is", null)
    .where("group_id", "=", LEGACY_GROUP_ID)
    .distinct()
    .execute();

  if (legacyGuests.length === 0) {
    console.log("✅ convert-legacy-guests-to-ghosts: nothing to migrate");
    return;
  }

  let createdGhosts = 0;
  let linkedSignups = 0;

  for (const row of legacyGuests) {
    const ownerId = row.owner_id as string | null;
    const playerName = row.player_name as string | null;
    if (!ownerId || !playerName) continue;

    const existingGhost = await db
      .selectFrom("group_roster")
      .select("id")
      .where("group_id", "=", LEGACY_GROUP_ID)
      .where("display_name", "=", playerName)
      .where("created_by_user_id", "=", ownerId)
      .where("phone", "is", null)
      .where("email", "is", null)
      .executeTakeFirst();

    const rosterId = existingGhost?.id ?? newRosterId();
    if (!existingGhost) {
      await db
        .insertInto("group_roster")
        .values({
          id: rosterId,
          group_id: LEGACY_GROUP_ID,
          display_name: playerName,
          phone: null,
          email: null,
          created_by_user_id: ownerId,
        })
        .execute();
      createdGhosts++;
    }

    const result = await db
      .updateTable("signups")
      .set({ roster_id: rosterId })
      .where("user_id", "is", null)
      .where("roster_id", "is", null)
      .where("group_id", "=", LEGACY_GROUP_ID)
      .where((eb) =>
        eb.or([
          eb("guest_owner_id", "=", ownerId),
          eb.and([eb("guest_owner_id", "is", null), eb("added_by_user_id", "=", ownerId)]),
        ]),
      )
      .where("player_name", "=", playerName)
      .executeTakeFirst();
    linkedSignups += Number(result.numUpdatedRows ?? 0);
  }

  console.log(
    `✅ convert-legacy-guests-to-ghosts: created ${createdGhosts} ghosts, linked ${linkedSignups} signups`,
  );
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // Unlink signups first so we don't leave dangling roster_id FKs.
  const unlinked = await db
    .updateTable("signups")
    .set({ roster_id: null })
    .where("group_id", "=", LEGACY_GROUP_ID)
    .where("user_id", "is", null)
    .where("roster_id", "is not", null)
    .where((eb) =>
      eb(
        "roster_id",
        "in",
        eb
          .selectFrom("group_roster")
          .select("id")
          .where("group_id", "=", LEGACY_GROUP_ID)
          .where("phone", "is", null)
          .where("email", "is", null),
      ),
    )
    .executeTakeFirst();

  // Then delete the migration-created ghosts. Contact-less ghosts in the
  // legacy group with a matching (display_name, created_by_user_id) tuple
  // against a still-present signup are our targets. After unlinking above
  // the signup has roster_id NULL, so we use guest_owner_id/player_name
  // for the predicate.
  const deleted = await sql<{ count: number }>`
    DELETE FROM group_roster
    WHERE group_id = ${LEGACY_GROUP_ID}
      AND phone IS NULL
      AND email IS NULL
      AND EXISTS (
        SELECT 1 FROM signups s
        WHERE s.group_id = ${LEGACY_GROUP_ID}
          AND s.user_id IS NULL
          AND s.player_name = group_roster.display_name
          AND (
            s.guest_owner_id = group_roster.created_by_user_id
            OR (s.guest_owner_id IS NULL AND s.added_by_user_id = group_roster.created_by_user_id)
          )
      )
  `.execute(db);

  console.log(
    `✅ convert-legacy-guests-to-ghosts (down): unlinked ${Number(
      unlinked.numUpdatedRows ?? 0,
    )} signups, deleted ${deleted.numAffectedRows ?? "?"} ghosts`,
  );
};
