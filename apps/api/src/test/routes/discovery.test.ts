import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import type { Kysely } from "kysely";

import { makeTestDb } from "../helpers/db";
import { seedGroup, seedMembership, seedUser } from "../helpers/fixtures";
import type { AppVariables, SessionUser } from "../../middleware/security";
import discoveryRoute from "../../routes/discovery";

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
  const a = new Hono<{ Variables: AppVariables }>();
  a.use("*", async (c: Context, next: Next) => {
    c.set("user", user);
    return next();
  });
  a.route("/discovery", discoveryRoute);
  return a;
}

function persona(id: string): SessionUser {
  return { id, role: "user", email: `${id}@test.local`, name: `User ${id.slice(-4)}` };
}

function post(path: string, body?: unknown) {
  return new Request(`http://t${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /discovery/search", () => {
  test("returns public groups only", async () => {
    const owner = await seedUser(db);
    const pub = await seedGroup(db, { ownerUserId: owner.id, name: "Searchable FC", visibility: "public" });
    await seedGroup(db, { ownerUserId: owner.id, name: "Searchable Secret", visibility: "private" });
    const seeker = await seedUser(db);

    const res = await appAs(persona(seeker.id)).fetch(
      new Request("http://t/discovery/search?q=Searchable"),
    );
    expect(res.status).toBe(200);
    const { results } = (await res.json()) as { results: Array<{ id: string; name: string }> };
    expect(results.some((r) => r.id === pub.id)).toBe(true);
    expect(results.some((r) => r.name === "Searchable Secret")).toBe(false);
  });
});

describe("POST /discovery/groups/:id/join-requests", () => {
  test("submits, then 409 on duplicate", async () => {
    const owner = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id, name: "Join FC", visibility: "public" });
    const seeker = await seedUser(db);
    const app = appAs(persona(seeker.id));

    const first = await app.fetch(post(`/discovery/groups/${group.id}/join-requests`, {}));
    expect(first.status).toBe(201);
    const second = await app.fetch(post(`/discovery/groups/${group.id}/join-requests`, {}));
    expect(second.status).toBe(409);
  });

  test("404 for a private group", async () => {
    const owner = await seedUser(db);
    const priv = await seedGroup(db, { ownerUserId: owner.id, visibility: "private" });
    const seeker = await seedUser(db);
    const res = await appAs(persona(seeker.id)).fetch(
      post(`/discovery/groups/${priv.id}/join-requests`, {}),
    );
    expect(res.status).toBe(404);
  });

  test("409 when already a member", async () => {
    const owner = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id, name: "Member FC", visibility: "public" });
    const member = await seedUser(db);
    await seedMembership(db, { groupId: group.id, userId: member.id, role: "member" });
    const res = await appAs(persona(member.id)).fetch(
      post(`/discovery/groups/${group.id}/join-requests`, {}),
    );
    expect(res.status).toBe(409);
  });
});

describe("DELETE /discovery/join-requests/:id", () => {
  test("cancels own pending request", async () => {
    const owner = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id, visibility: "public" });
    const seeker = await seedUser(db);
    const app = appAs(persona(seeker.id));
    const submit = await app.fetch(post(`/discovery/groups/${group.id}/join-requests`, {}));
    const { request } = (await submit.json()) as { request: { id: string } };

    const del = await app.fetch(
      new Request(`http://t/discovery/join-requests/${request.id}`, { method: "DELETE" }),
    );
    expect(del.status).toBe(200);
  });

  test("a different user cannot cancel someone else's request (404)", async () => {
    const owner = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id, name: "Owned Req FC", visibility: "public" });
    const userA = await seedUser(db);
    const userB = await seedUser(db);
    const submit = await appAs(persona(userA.id)).fetch(
      post(`/discovery/groups/${group.id}/join-requests`, {}),
    );
    const { request } = (await submit.json()) as { request: { id: string } };

    const asB = await appAs(persona(userB.id)).fetch(
      new Request(`http://t/discovery/join-requests/${request.id}`, { method: "DELETE" }),
    );
    expect(asB.status).toBe(404);

    // A's request is untouched — A can still cancel it.
    const asA = await appAs(persona(userA.id)).fetch(
      new Request(`http://t/discovery/join-requests/${request.id}`, { method: "DELETE" }),
    );
    expect(asA.status).toBe(200);
  });
});
