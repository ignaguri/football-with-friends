import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Kysely } from "kysely";

import { makeTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { ServiceFactory, resetServiceFactory } from "@repo/shared/services";

let db: Kysely<any>;
let cleanup: () => Promise<void>;
let factory: ServiceFactory;
let service: ServiceFactory["groupRequestService"];

beforeAll(async () => {
  const harness = await makeTestDb();
  db = harness.db;
  cleanup = harness.cleanup;
  resetServiceFactory();
  factory = new ServiceFactory();
  service = factory.groupRequestService;
});

afterAll(async () => {
  await cleanup();
});

describe("GroupCreationRequestService.submit", () => {
  test("creates a pending request", async () => {
    const user = await seedUser(db);
    const outcome = await service.submit({ userId: user.id, name: "Sunday FC", reason: "weekly" });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.request.status).toBe("pending");
  });

  test("rejects a second concurrent pending request", async () => {
    const user = await seedUser(db);
    await service.submit({ userId: user.id, name: "A", reason: "x" });
    const second = await service.submit({ userId: user.id, name: "B", reason: "y" });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("already_pending");
  });
});

describe("GroupCreationRequestService.approve", () => {
  test("creates a group with the requester as owner + organizer", async () => {
    const user = await seedUser(db);
    const admin = await seedUser(db, { role: "admin" });
    const submitted = await service.submit({ userId: user.id, name: "Padel Pals", reason: "padel" });
    if (!submitted.ok) throw new Error("expected submit ok");

    const { group } = await service.approve(submitted.request.id, admin.id);
    expect(group.ownerUserId).toBe(user.id);

    const membership = await db
      .selectFrom("group_members")
      .select(["role"])
      .where("group_id", "=", group.id)
      .where("user_id", "=", user.id)
      .executeTakeFirstOrThrow();
    expect(membership.role).toBe("organizer");

    const row = await db
      .selectFrom("group_creation_requests")
      .select(["status", "created_group_id"])
      .where("id", "=", submitted.request.id)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe("approved");
    expect(row.created_group_id).toBe(group.id);
  });

  test("throws when the request is not pending", async () => {
    const user = await seedUser(db);
    const admin = await seedUser(db, { role: "admin" });
    const submitted = await service.submit({ userId: user.id, name: "Once", reason: "z" });
    if (!submitted.ok) throw new Error("expected submit ok");
    await service.approve(submitted.request.id, admin.id);
    await expect(service.approve(submitted.request.id, admin.id)).rejects.toThrow(/not pending/i);
  });
});

describe("GroupCreationRequestService.reject", () => {
  test("sets rejected + reason and creates no group; user can resubmit", async () => {
    const user = await seedUser(db);
    const admin = await seedUser(db, { role: "admin" });
    const submitted = await service.submit({ userId: user.id, name: "Nope FC", reason: "q" });
    if (!submitted.ok) throw new Error("expected submit ok");

    const rejected = await service.reject(submitted.request.id, admin.id, "too similar to an existing group");
    expect(rejected.status).toBe("rejected");
    expect(rejected.decisionReason).toBe("too similar to an existing group");
    expect(rejected.createdGroupId).toBeUndefined();

    // resubmit allowed once the prior request is decided
    const again = await service.submit({ userId: user.id, name: "Nope FC 2", reason: "q2" });
    expect(again.ok).toBe(true);
  });
});

describe("GroupCreationRequestService.cancel", () => {
  test("cancel removes the caller's pending request", async () => {
    const user = await seedUser(db);
    const submitted = await service.submit({ userId: user.id, name: "Cancel Me", reason: "c" });
    if (!submitted.ok) throw new Error("expected submit ok");
    expect(await service.cancel(submitted.request.id, user.id)).toBe(true);
    const again = await service.submit({ userId: user.id, name: "After Cancel", reason: "c2" });
    expect(again.ok).toBe(true);
  });

  test("non-owner cannot cancel another user's request", async () => {
    const userA = await seedUser(db);
    const userB = await seedUser(db);
    const submitted = await service.submit({ userId: userA.id, name: "Mine FC", reason: "a" });
    if (!submitted.ok) throw new Error("expected submit ok");

    // userB's cancel attempt must fail
    expect(await service.cancel(submitted.request.id, userB.id)).toBe(false);

    // userA's request is still pending: a second submit from userA is blocked
    const blocked = await service.submit({ userId: userA.id, name: "Mine FC 2", reason: "a2" });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe("already_pending");

    // the owner can still cancel it
    expect(await service.cancel(submitted.request.id, userA.id)).toBe(true);
  });
});
