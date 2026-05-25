import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import type { Kysely } from "kysely";

import { makeTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import type { AppVariables, SessionUser } from "../../middleware/security";
import groupRequestsRoute from "../../routes/group-requests";

let db: Kysely<any>;
let cleanup: () => Promise<void>;

beforeAll(async () => {
  const harness = await makeTestDb();
  db = harness.db;
  cleanup = harness.cleanup;
});

afterAll(async () => {
  await cleanup();
});

function appAs(user: SessionUser) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use("*", async (c: Context, next: Next) => {
    c.set("user", user);
    return next();
  });
  app.route("/group-requests", groupRequestsRoute);
  return app;
}

function persona(id: string, role: "user" | "admin"): SessionUser {
  return { id, role, email: `${id}@test.local`, name: `User ${id.slice(-4)}` };
}

function post(path: string, body?: unknown) {
  return new Request(`http://test.local${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("POST /group-requests", () => {
  test("any authed user can submit; 409 on a second pending", async () => {
    const user = await seedUser(db);
    const app = appAs(persona(user.id, "user"));

    const first = await app.fetch(post("/group-requests", { name: "Sunday FC", reason: "weekly" }));
    expect(first.status).toBe(201);

    const second = await app.fetch(post("/group-requests", { name: "Other", reason: "again" }));
    expect(second.status).toBe(409);
  });

  test("rejects empty name (validation)", async () => {
    const user = await seedUser(db);
    const app = appAs(persona(user.id, "user"));
    const res = await app.fetch(post("/group-requests", { name: "", reason: "x" }));
    expect(res.status).toBe(400);
  });
});

describe("admin-gated endpoints", () => {
  test("non-admin gets 403 on list/approve/reject", async () => {
    const user = await seedUser(db);
    const app = appAs(persona(user.id, "user"));

    expect((await app.fetch(new Request("http://test.local/group-requests"))).status).toBe(403);
    expect((await app.fetch(post("/group-requests/gcr_x/approve"))).status).toBe(403);
    expect(
      (await app.fetch(post("/group-requests/gcr_x/reject", { reason: "no" }))).status,
    ).toBe(403);
  });

  test("admin approve creates a group; requester owns it", async () => {
    const requester = await seedUser(db);
    const admin = await seedUser(db, { role: "admin" });

    const submit = await appAs(persona(requester.id, "user")).fetch(
      post("/group-requests", { name: "Approved FC", reason: "yes" }),
    );
    const { request } = (await submit.json()) as { request: { id: string } };

    const approve = await appAs(persona(admin.id, "admin")).fetch(
      post(`/group-requests/${request.id}/approve`),
    );
    expect(approve.status).toBe(200);
    const { group } = (await approve.json()) as { group: { id: string; ownerUserId: string } };
    expect(group.ownerUserId).toBe(requester.id);
  });

  test("admin reject requires a reason and decides the request", async () => {
    const requester = await seedUser(db);
    const admin = await seedUser(db, { role: "admin" });

    const submit = await appAs(persona(requester.id, "user")).fetch(
      post("/group-requests", { name: "Reject FC", reason: "meh" }),
    );
    const { request } = (await submit.json()) as { request: { id: string } };

    const noReason = await appAs(persona(admin.id, "admin")).fetch(
      post(`/group-requests/${request.id}/reject`, {}),
    );
    expect(noReason.status).toBe(400);

    const ok = await appAs(persona(admin.id, "admin")).fetch(
      post(`/group-requests/${request.id}/reject`, { reason: "duplicate" }),
    );
    expect(ok.status).toBe(200);
  });
});

describe("GET /group-requests/me", () => {
  test("returns own submitted requests", async () => {
    const user = await seedUser(db);
    const app = appAs(persona(user.id, "user"));

    await app.fetch(post("/group-requests", { name: "My FC", reason: "mine" }));

    const res = await app.fetch(new Request("http://test.local/group-requests/me"));
    expect(res.status).toBe(200);
    const { requests } = (await res.json()) as { requests: { id: string }[] };
    expect(requests.length).toBeGreaterThanOrEqual(1);
  });
});

describe("DELETE /group-requests/:id (cancel own pending)", () => {
  test("owner can cancel and then resubmit", async () => {
    const user = await seedUser(db);
    const app = appAs(persona(user.id, "user"));
    const submit = await app.fetch(post("/group-requests", { name: "Cancel FC", reason: "c" }));
    const { request } = (await submit.json()) as { request: { id: string } };

    const del = await app.fetch(
      new Request(`http://test.local/group-requests/${request.id}`, { method: "DELETE" }),
    );
    expect(del.status).toBe(200);

    const resubmit = await app.fetch(post("/group-requests", { name: "New FC", reason: "c2" }));
    expect(resubmit.status).toBe(201);
  });

  test("non-owner cannot cancel another user's request (404)", async () => {
    const userA = await seedUser(db);
    const userB = await seedUser(db);

    const submit = await appAs(persona(userA.id, "user")).fetch(
      post("/group-requests", { name: "Steal FC", reason: "x" }),
    );
    const { request } = (await submit.json()) as { request: { id: string } };

    // B tries to delete A's request — should get 404 (non-owner; deletePending returns false)
    const del = await appAs(persona(userB.id, "user")).fetch(
      new Request(`http://test.local/group-requests/${request.id}`, { method: "DELETE" }),
    );
    expect(del.status).toBe(404);

    // A's request is still pending — A submitting again yields 409
    const resubmit = await appAs(persona(userA.id, "user")).fetch(
      post("/group-requests", { name: "Another FC", reason: "again" }),
    );
    expect(resubmit.status).toBe(409);
  });
});
