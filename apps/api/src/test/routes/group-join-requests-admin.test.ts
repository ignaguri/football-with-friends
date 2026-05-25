import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import type { Kysely } from "kysely";

import { makeTestDb } from "../helpers/db";
import { seedGroup, seedMembership, seedUser } from "../helpers/fixtures";
import type { AppVariables, SessionUser } from "../../middleware/security";
import groupsRoute from "../../routes/groups";
import { getServiceFactory, resetServiceFactory } from "@repo/shared/services";

let db: Kysely<any>;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const harness = await makeTestDb();
  db = harness.db;
  cleanup = harness.cleanup;
  resetServiceFactory();
});

afterAll(async () => {
  await cleanup();
});

function app(user: SessionUser, group: { id: string; role: "organizer" | "member"; isOwner: boolean }) {
  const a = new Hono<{ Variables: AppVariables }>();
  a.use("*", async (c: Context, next: Next) => {
    c.set("user", user);
    c.set("currentGroup", group);
    c.req.raw.headers.set("X-Group-Id", group.id);
    return next();
  });
  a.route("/groups", groupsRoute);
  return a;
}

function persona(id: string, role: "user" | "admin" = "user"): SessionUser {
  return { id, role, email: `${id}@test.local`, name: `User ${id.slice(-4)}` };
}

async function setup() {
  const owner = await seedUser(db);
  const group = await seedGroup(db, { ownerUserId: owner.id, visibility: "public" });
  const requester = await seedUser(db);
  const submitted = await getServiceFactory().groupJoinRequestService.submitJoinRequest({
    groupId: group.id,
    userId: requester.id,
  });
  if (!submitted.ok) throw new Error("expected ok");
  return { owner, group, requester, requestId: submitted.request.id };
}

describe("group join-request review", () => {
  test("non-organizer member is 403 on the queue", async () => {
    const { group } = await setup();
    const member = await seedUser(db);
    await seedMembership(db, { groupId: group.id, userId: member.id, role: "member" });
    const res = await app(persona(member.id), { id: group.id, role: "member", isOwner: false }).fetch(
      new Request(`http://t/groups/${group.id}/join-requests`),
    );
    expect(res.status).toBe(403);
  });

  test("organizer approves → requester becomes a member", async () => {
    const { owner, group, requester, requestId } = await setup();
    const res = await app(persona(owner.id), { id: group.id, role: "organizer", isOwner: true }).fetch(
      new Request(`http://t/groups/${group.id}/join-requests/${requestId}/approve`, { method: "POST" }),
    );
    expect(res.status).toBe(200);
    const membership = await db
      .selectFrom("group_members")
      .select(["role"])
      .where("group_id", "=", group.id)
      .where("user_id", "=", requester.id)
      .executeTakeFirst();
    expect(membership?.role).toBe("member");
  });

  test("reject requires a reason", async () => {
    const { owner, group, requestId } = await setup();
    const noReason = await app(persona(owner.id), { id: group.id, role: "organizer", isOwner: true }).fetch(
      new Request(`http://t/groups/${group.id}/join-requests/${requestId}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(noReason.status).toBe(400);
  });
});

describe("visibility toggle", () => {
  test("owner can flip visibility; non-owner organizer cannot", async () => {
    const owner = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id, visibility: "private" });
    const organizer = await seedUser(db);
    await seedMembership(db, { groupId: group.id, userId: organizer.id, role: "organizer" });

    const denied = await app(persona(organizer.id), { id: group.id, role: "organizer", isOwner: false }).fetch(
      new Request(`http://t/groups/${group.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: "public" }),
      }),
    );
    expect(denied.status).toBe(403);

    const ok = await app(persona(owner.id), { id: group.id, role: "organizer", isOwner: true }).fetch(
      new Request(`http://t/groups/${group.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: "public" }),
      }),
    );
    expect(ok.status).toBe(200);
  });
});
