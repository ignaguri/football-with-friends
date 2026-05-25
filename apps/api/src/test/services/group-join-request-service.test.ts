import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Kysely } from "kysely";

import { makeTestDb } from "../helpers/db";
import { seedGroup, seedMembership, seedUser } from "../helpers/fixtures";
import { ServiceFactory, resetServiceFactory } from "@repo/shared/services";

let db: Kysely<any>;
let cleanup: () => Promise<void>;
let service: ServiceFactory["groupJoinRequestService"];

beforeAll(async () => {
  const harness = await makeTestDb();
  db = harness.db;
  cleanup = harness.cleanup;
  resetServiceFactory();
  service = new ServiceFactory().groupJoinRequestService;
});

afterAll(async () => {
  await cleanup();
});

async function publicGroup() {
  const owner = await seedUser(db);
  const group = await seedGroup(db, { ownerUserId: owner.id, visibility: "public" });
  return { owner, group };
}

describe("searchGroups", () => {
  test("returns only public groups with relationship", async () => {
    const { group } = await publicGroup();
    const privOwner = await seedUser(db);
    await seedGroup(db, { ownerUserId: privOwner.id, name: "Hidden", visibility: "private" });
    const seeker = await seedUser(db);

    const results = await service.searchGroups(group.name.slice(0, 4), seeker.id);
    expect(results.some((r) => r.id === group.id)).toBe(true);
    expect(results.every((r) => r.relationship === "none")).toBe(true);
    expect(results.some((r) => r.name === "Hidden")).toBe(false);
  });

  test("relationship reflects membership and pending requests", async () => {
    const { group } = await publicGroup();
    const member = await seedUser(db);
    await seedMembership(db, { groupId: group.id, userId: member.id, role: "member" });
    const memberResults = await service.searchGroups(group.name.slice(0, 4), member.id);
    expect(memberResults.find((r) => r.id === group.id)?.relationship).toBe("member");

    const requester = await seedUser(db);
    await service.submitJoinRequest({ groupId: group.id, userId: requester.id });
    const reqResults = await service.searchGroups(group.name.slice(0, 4), requester.id);
    expect(reqResults.find((r) => r.id === group.id)?.relationship).toBe("pending");
  });
});

describe("submitJoinRequest", () => {
  test("rejects a private group", async () => {
    const owner = await seedUser(db);
    const priv = await seedGroup(db, { ownerUserId: owner.id, visibility: "private" });
    const user = await seedUser(db);
    const out = await service.submitJoinRequest({ groupId: priv.id, userId: user.id });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("not_public");
  });

  test("rejects when already a member", async () => {
    const { group } = await publicGroup();
    const member = await seedUser(db);
    await seedMembership(db, { groupId: group.id, userId: member.id, role: "member" });
    const out = await service.submitJoinRequest({ groupId: group.id, userId: member.id });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("already_member");
  });

  test("rejects a duplicate pending request", async () => {
    const { group } = await publicGroup();
    const user = await seedUser(db);
    await service.submitJoinRequest({ groupId: group.id, userId: user.id });
    const out = await service.submitJoinRequest({ groupId: group.id, userId: user.id });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("already_pending");
  });
});

describe("approve / reject / cancel", () => {
  test("approve adds membership and marks approved", async () => {
    const { owner, group } = await publicGroup();
    const user = await seedUser(db);
    const submitted = await service.submitJoinRequest({ groupId: group.id, userId: user.id });
    if (!submitted.ok) throw new Error("expected ok");

    const result = await service.approve(submitted.request.id, group.id, owner.id);
    expect(result.request.status).toBe("approved");
    expect(result.group.id).toBe(group.id);

    const membership = await db
      .selectFrom("group_members")
      .select(["role"])
      .where("group_id", "=", group.id)
      .where("user_id", "=", user.id)
      .executeTakeFirst();
    expect(membership?.role).toBe("member");
  });

  test("reject requires reason and adds no membership; user can resubmit", async () => {
    const { owner, group } = await publicGroup();
    const user = await seedUser(db);
    const submitted = await service.submitJoinRequest({ groupId: group.id, userId: user.id });
    if (!submitted.ok) throw new Error("expected ok");

    const rejected = await service.reject(submitted.request.id, group.id, owner.id, "full this season");
    expect(rejected.status).toBe("rejected");

    const membership = await db
      .selectFrom("group_members")
      .selectAll()
      .where("group_id", "=", group.id)
      .where("user_id", "=", user.id)
      .executeTakeFirst();
    expect(membership).toBeUndefined();

    const again = await service.submitJoinRequest({ groupId: group.id, userId: user.id });
    expect(again.ok).toBe(true);
  });

  test("cancel removes the pending request", async () => {
    const { group } = await publicGroup();
    const user = await seedUser(db);
    const submitted = await service.submitJoinRequest({ groupId: group.id, userId: user.id });
    if (!submitted.ok) throw new Error("expected ok");
    expect(await service.cancel(submitted.request.id, user.id)).toBe(true);
  });
});
