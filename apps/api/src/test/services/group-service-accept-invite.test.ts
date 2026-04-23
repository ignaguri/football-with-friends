// Direct-unit coverage for GroupService.acceptInvite — the hairy one: idempotent
// membership add, invite invalid-reason taxonomy, and ghost auto-claim (including
// the two-ambiguous-matches branch).

import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import type { Kysely } from "kysely";

import { makeTestDb } from "../helpers/db";
import {
  seedGroup,
  seedInvite,
  seedRoster,
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

describe("acceptInvite — ghost auto-claim", () => {
  test("single unclaimed ghost matching phone is auto-claimed", async () => {
    const organizer = await seedUser(db, { name: "Organizer-A" });
    const group = await seedGroup(db, { ownerUserId: organizer.id });
    const invitee = await seedUser(db, {
      name: "Invitee-1",
      phone: "+4915111111111",
    });
    const ghost = await seedRoster(db, {
      groupId: group.id,
      displayName: "Ghost One",
      phone: "+4915111111111",
      createdByUserId: organizer.id,
    });
    const invite = await seedInvite(db, {
      groupId: group.id,
      createdByUserId: organizer.id,
    });

    const result = await service.acceptInvite({
      token: invite.token,
      userId: invitee.id,
    });

    expect(result.joined).toBe(true);
    if (result.joined) {
      expect(result.claimedRosterId).toBe(ghost.id);
      expect(result.ambiguousRosterMatches).toBeUndefined();
    }
  });

  test("two unclaimed ghosts matching phone → none claimed, ambiguousRosterMatches=2", async () => {
    const organizer = await seedUser(db, { name: "Organizer-B" });
    const group = await seedGroup(db, { ownerUserId: organizer.id });
    const invitee = await seedUser(db, {
      name: "Invitee-2",
      phone: "+4915222222222",
    });
    await seedRoster(db, {
      groupId: group.id,
      displayName: "Ghost A",
      phone: "+4915222222222",
      createdByUserId: organizer.id,
    });
    await seedRoster(db, {
      groupId: group.id,
      displayName: "Ghost B",
      phone: "+4915222222222",
      createdByUserId: organizer.id,
    });
    const invite = await seedInvite(db, {
      groupId: group.id,
      createdByUserId: organizer.id,
    });

    const result = await service.acceptInvite({
      token: invite.token,
      userId: invitee.id,
    });

    expect(result.joined).toBe(true);
    if (result.joined) {
      expect(result.claimedRosterId).toBeUndefined();
      expect(result.ambiguousRosterMatches).toBe(2);
    }
  });
});

describe("acceptInvite — idempotency", () => {
  test("accepting the same invite twice produces one membership and newMembership=false the second time", async () => {
    const organizer = await seedUser(db, { name: "Organizer-C" });
    const group = await seedGroup(db, { ownerUserId: organizer.id });
    const invitee = await seedUser(db, { name: "Invitee-3" });
    const invite = await seedInvite(db, {
      groupId: group.id,
      createdByUserId: organizer.id,
    });

    const first = await service.acceptInvite({
      token: invite.token,
      userId: invitee.id,
    });
    const second = await service.acceptInvite({
      token: invite.token,
      userId: invitee.id,
    });

    expect(first.joined).toBe(true);
    expect(second.joined).toBe(true);

    const memberships = await db
      .selectFrom("group_members")
      .select((eb) => eb.fn.countAll<number>().as("c"))
      .where("group_id", "=", group.id)
      .where("user_id", "=", invitee.id)
      .executeTakeFirstOrThrow();
    expect(Number(memberships.c)).toBe(1);

    // uses_count only bumps when a new membership was actually created, so
    // the idempotent second call must not further increment.
    const invRow = await db
      .selectFrom("group_invites")
      .select(["uses_count"])
      .where("id", "=", invite.id)
      .executeTakeFirstOrThrow();
    expect(Number(invRow.uses_count)).toBe(1);
  });
});

describe("acceptInvite — invalid reasons", () => {
  test("expired invite → reason=expired", async () => {
    const organizer = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: organizer.id });
    const invitee = await seedUser(db);
    const invite = await seedInvite(db, {
      groupId: group.id,
      createdByUserId: organizer.id,
      expiresAt: new Date(Date.now() - 60_000),
    });

    const result = await service.acceptInvite({
      token: invite.token,
      userId: invitee.id,
    });
    expect(result).toEqual({ joined: false, reason: "expired" });
  });

  test("revoked invite → reason=revoked", async () => {
    const organizer = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: organizer.id });
    const invitee = await seedUser(db);
    const invite = await seedInvite(db, {
      groupId: group.id,
      createdByUserId: organizer.id,
      revokedAt: new Date(),
    });

    const result = await service.acceptInvite({
      token: invite.token,
      userId: invitee.id,
    });
    expect(result).toEqual({ joined: false, reason: "revoked" });
  });

  test("exhausted invite (maxUses reached) → reason=exhausted", async () => {
    const organizer = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: organizer.id });
    const invitee = await seedUser(db);
    const invite = await seedInvite(db, {
      groupId: group.id,
      createdByUserId: organizer.id,
      maxUses: 1,
      usesCount: 1,
    });

    const result = await service.acceptInvite({
      token: invite.token,
      userId: invitee.id,
    });
    expect(result).toEqual({ joined: false, reason: "exhausted" });
  });

  test("target_mismatch by userId", async () => {
    const organizer = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: organizer.id });
    const intended = await seedUser(db);
    const imposter = await seedUser(db);
    const invite = await seedInvite(db, {
      groupId: group.id,
      createdByUserId: organizer.id,
      targetUserId: intended.id,
    });

    const result = await service.acceptInvite({
      token: invite.token,
      userId: imposter.id,
    });
    expect(result).toEqual({ joined: false, reason: "target_mismatch" });
  });

  test("target_mismatch by phone", async () => {
    const organizer = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: organizer.id });
    const wrongPhoneUser = await seedUser(db, { phone: "+4915333333333" });
    const invite = await seedInvite(db, {
      groupId: group.id,
      createdByUserId: organizer.id,
      targetPhone: "+4915999999999",
    });

    const result = await service.acceptInvite({
      token: invite.token,
      userId: wrongPhoneUser.id,
    });
    expect(result).toEqual({ joined: false, reason: "target_mismatch" });
  });

  test("soft-deleted group → reason=not_found (group vanishes from findById)", async () => {
    const organizer = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: organizer.id });
    const invitee = await seedUser(db);
    const invite = await seedInvite(db, {
      groupId: group.id,
      createdByUserId: organizer.id,
    });

    await db
      .updateTable("groups")
      .set({ deleted_at: new Date().toISOString() })
      .where("id", "=", group.id)
      .execute();

    const result = await service.acceptInvite({
      token: invite.token,
      userId: invitee.id,
    });
    expect(result).toEqual({ joined: false, reason: "not_found" });
  });

  test("unknown token → reason=not_found", async () => {
    const invitee = await seedUser(db);
    const result = await service.acceptInvite({
      token: "does-not-exist",
      userId: invitee.id,
    });
    expect(result).toEqual({ joined: false, reason: "not_found" });
  });
});
