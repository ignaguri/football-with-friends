// Ownership semantics: transfer, leave, and soft-delete. These invariants
// span multiple rows (owner column on groups + organizer role on
// group_members) so tests live on the service rather than the repo.

import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import type { Kysely } from "kysely";

import { makeTestDb } from "../helpers/db";
import { seedGroup, seedMembership, seedUser } from "../helpers/fixtures";
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

describe("transferOwnership", () => {
  test("rejects when caller is not the current owner", async () => {
    const owner = await seedUser(db);
    const intruder = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id });
    await seedMembership(db, {
      groupId: group.id,
      userId: intruder.id,
      role: "organizer",
    });

    await expect(service.transferOwnership(group.id, intruder.id, owner.id)).rejects.toThrow(
      /current owner/i,
    );
  });

  test("rejects when target is not already an organizer", async () => {
    const owner = await seedUser(db);
    const target = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id });
    await seedMembership(db, {
      groupId: group.id,
      userId: target.id,
      role: "member",
    });

    await expect(service.transferOwnership(group.id, owner.id, target.id)).rejects.toThrow(
      /organizer/i,
    );
  });

  test("happy path: owner_user_id flips, old owner stays organizer", async () => {
    const oldOwner = await seedUser(db);
    const newOwner = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: oldOwner.id });
    await seedMembership(db, {
      groupId: group.id,
      userId: newOwner.id,
      role: "organizer",
    });

    await service.transferOwnership(group.id, oldOwner.id, newOwner.id);

    const row = await db
      .selectFrom("groups")
      .select(["owner_user_id"])
      .where("id", "=", group.id)
      .executeTakeFirstOrThrow();
    expect(row.owner_user_id).toBe(newOwner.id);

    const oldOwnerMembership = await db
      .selectFrom("group_members")
      .select(["role"])
      .where("group_id", "=", group.id)
      .where("user_id", "=", oldOwner.id)
      .executeTakeFirstOrThrow();
    // Transfer doesn't touch membership role — old owner remains organizer.
    expect(oldOwnerMembership.role).toBe("organizer");
  });
});

describe("leaveGroup", () => {
  test("owner cannot leave — must transfer first", async () => {
    const owner = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id });

    await expect(service.leaveGroup(group.id, owner.id)).rejects.toThrow(/owner cannot leave/i);
  });

  test("non-owner leave removes membership row", async () => {
    const owner = await seedUser(db);
    const member = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id });
    await seedMembership(db, {
      groupId: group.id,
      userId: member.id,
      role: "member",
    });

    await service.leaveGroup(group.id, member.id);

    const remaining = await db
      .selectFrom("group_members")
      .selectAll()
      .where("group_id", "=", group.id)
      .where("user_id", "=", member.id)
      .executeTakeFirst();
    expect(remaining).toBeUndefined();
  });
});

describe("softDeleteGroup", () => {
  test("sets deleted_at and makes findById return null", async () => {
    const owner = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id });

    await service.softDeleteGroup(group.id);

    const basics = await service.getGroupBasics(group.id);
    expect(basics).toBeNull();

    const raw = await db
      .selectFrom("groups")
      .select(["id", "deleted_at"])
      .where("id", "=", group.id)
      .executeTakeFirstOrThrow();
    expect(raw.deleted_at).not.toBeNull();
  });
});
