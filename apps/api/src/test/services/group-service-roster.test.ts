// Ghost-roster business rules: collision rejection on create; signup-aware
// deletion (refuse by default, nulls signup.roster_id under force).

import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import type { Kysely } from "kysely";

import { makeTestDb } from "../helpers/db";
import {
  seedGroup,
  seedLocation,
  seedMatch,
  seedMembership,
  seedRoster,
  seedSignup,
  seedUser,
} from "../helpers/fixtures";
import { ServiceFactory, resetServiceFactory } from "@repo/shared/services";

let db: Kysely<any>;
let cleanup: () => Promise<void>;
let service: ServiceFactory["groupService"];

beforeAll(async () => {
  const harness = await makeTestDb();
  db = harness.db;
  cleanup = harness.cleanup;
  resetServiceFactory();
  service = new ServiceFactory().groupService;
});

afterAll(async () => {
  await cleanup();
});

describe("createRosterEntry — collisions", () => {
  test("phone matches existing member → rejects with already_member + userId", async () => {
    const organizer = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: organizer.id });
    const existingMember = await seedUser(db, { phone: "+4915700000001" });
    await seedMembership(db, {
      groupId: group.id,
      userId: existingMember.id,
      role: "member",
    });

    const result = await service.createRosterEntry({
      groupId: group.id,
      displayName: "Would-be ghost",
      phone: "+4915700000001",
      createdByUserId: organizer.id,
    });

    expect(result).toEqual({
      created: false,
      reason: "already_member",
      userId: existingMember.id,
    });
  });

  test("no collision → creates and returns entry", async () => {
    const organizer = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: organizer.id });

    const result = await service.createRosterEntry({
      groupId: group.id,
      displayName: "Fresh ghost",
      phone: "+4915700000099",
      createdByUserId: organizer.id,
    });

    expect(result.created).toBe(true);
    if (result.created) {
      expect(result.entry.displayName).toBe("Fresh ghost");
      expect(result.entry.phone).toBe("+4915700000099");
    }
  });
});

describe("deleteRosterEntry — signup references", () => {
  test("referenced ghost without force → refuses and returns count", async () => {
    const organizer = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: organizer.id });
    const location = await seedLocation(db, { groupId: group.id });
    const match = await seedMatch(db, {
      locationId: location.id,
      groupId: group.id,
      createdByUserId: organizer.id,
    });
    const ghost = await seedRoster(db, {
      groupId: group.id,
      displayName: "Ref ghost",
      createdByUserId: organizer.id,
    });
    await seedSignup(db, {
      matchId: match.id,
      rosterId: ghost.id,
      playerName: "Ref ghost",
      addedByUserId: organizer.id,
      groupId: group.id,
    });
    await seedSignup(db, {
      matchId: match.id,
      rosterId: ghost.id,
      playerName: "Ref ghost again",
      addedByUserId: organizer.id,
      groupId: group.id,
    });

    const result = await service.deleteRosterEntry(ghost.id, group.id);
    expect(result).toEqual({
      deleted: false,
      reason: "referenced",
      referencingSignupCount: 2,
    });

    const stillThere = await db
      .selectFrom("group_roster")
      .selectAll()
      .where("id", "=", ghost.id)
      .executeTakeFirst();
    expect(stillThere).toBeDefined();
  });

  test("referenced ghost with force=true → nulls signups.roster_id and deletes ghost", async () => {
    const organizer = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: organizer.id });
    const location = await seedLocation(db, { groupId: group.id });
    const match = await seedMatch(db, {
      locationId: location.id,
      groupId: group.id,
      createdByUserId: organizer.id,
    });
    const ghost = await seedRoster(db, {
      groupId: group.id,
      displayName: "Forceable ghost",
      createdByUserId: organizer.id,
    });
    const signup = await seedSignup(db, {
      matchId: match.id,
      rosterId: ghost.id,
      playerName: "Forceable ghost",
      addedByUserId: organizer.id,
      groupId: group.id,
    });

    const result = await service.deleteRosterEntry(ghost.id, group.id, {
      force: true,
    });
    expect(result).toEqual({ deleted: true });

    const ghostRow = await db
      .selectFrom("group_roster")
      .selectAll()
      .where("id", "=", ghost.id)
      .executeTakeFirst();
    expect(ghostRow).toBeUndefined();

    const signupRow = await db
      .selectFrom("signups")
      .select(["roster_id"])
      .where("id", "=", signup.id)
      .executeTakeFirstOrThrow();
    // Force path preserves signup history by nulling roster_id rather than deleting.
    expect(signupRow.roster_id).toBeNull();
  });
});
