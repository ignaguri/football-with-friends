import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import type { Kysely } from "kysely";

import { makeTestDb } from "../helpers/db";
import { seedGroup, seedLocation, seedMatch, seedMembership, seedUser } from "../helpers/fixtures";
import type { AppVariables, SessionUser } from "../../middleware/security";
import matchesRoute from "../../routes/matches";

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

// Injects `user` and the `X-Group-Id` header. The matches route mounts
// `groupContextMiddleware` itself, which resolves `currentGroup` from real
// (seeded) memberships — so the resolved organizer/member role is authoritative.
function app(user: SessionUser, group: { id: string }) {
  const a = new Hono<{ Variables: AppVariables }>();
  a.use("*", async (c: Context, next: Next) => {
    c.set("user", user);
    c.req.raw.headers.set("X-Group-Id", group.id);
    return next();
  });
  a.route("/matches", matchesRoute);
  return a;
}

function persona(id: string, role: "user" | "admin" = "user"): SessionUser {
  return { id, role, email: `${id}@test.local`, name: `User ${id.slice(-4)}` };
}

async function scenario() {
  const owner = await seedUser(db);
  const group = await seedGroup(db, { ownerUserId: owner.id });
  const loc = await seedLocation(db, { groupId: group.id });
  const match = await seedMatch(db, {
    locationId: loc.id,
    groupId: group.id,
    createdByUserId: owner.id,
  });
  const member = await seedUser(db);
  await seedMembership(db, { groupId: group.id, userId: member.id, role: "member" });
  return { owner, group, loc, match, member };
}

describe("assign / clear organizer", () => {
  test("organizer assigns a member; non-organizer cannot assign", async () => {
    const { owner, group, match, member } = await scenario();
    const denied = await app(persona(member.id), { id: group.id }).fetch(
      new Request(`http://t/matches/${match.id}/organizer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: member.id }),
      }),
    );
    expect(denied.status).toBe(403);
    const ok = await app(persona(owner.id), { id: group.id }).fetch(
      new Request(`http://t/matches/${match.id}/organizer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: member.id }),
      }),
    );
    expect(ok.status).toBe(200);
  });

  test("assigning a non-member returns 400", async () => {
    const { owner, group, match } = await scenario();
    const stranger = await seedUser(db);
    const res = await app(persona(owner.id), { id: group.id }).fetch(
      new Request(`http://t/matches/${match.id}/organizer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: stranger.id }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("per-match organizer powers", () => {
  test("assigned member can DELETE their match; a plain member cannot", async () => {
    const { owner, group, match, member } = await scenario();
    await app(persona(owner.id), { id: group.id }).fetch(
      new Request(`http://t/matches/${match.id}/organizer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: member.id }),
      }),
    );
    const other = await seedUser(db);
    await seedMembership(db, { groupId: group.id, userId: other.id, role: "member" });
    const forbidden = await app(persona(other.id), { id: group.id }).fetch(
      new Request(`http://t/matches/${match.id}`, { method: "DELETE" }),
    );
    expect(forbidden.status).toBe(403);
    const allowed = await app(persona(member.id), { id: group.id }).fetch(
      new Request(`http://t/matches/${match.id}`, { method: "DELETE" }),
    );
    expect(allowed.status).toBe(200);
  });
});

describe("cross-group authorization guards", () => {
  test("signup PATCH 404s when the match belongs to another group (no organizer-power leak)", async () => {
    // Alice organizes match A in group A...
    const { owner, group: groupA, match: matchA, member: alice } = await scenario();
    await app(persona(owner.id), { id: groupA.id }).fetch(
      new Request(`http://t/matches/${matchA.id}/organizer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: alice.id }),
      }),
    );

    // ...but is only a plain member of group B, her active group here.
    const ownerB = await seedUser(db);
    const groupB = await seedGroup(db, { ownerUserId: ownerB.id });
    await seedMembership(db, { groupId: groupB.id, userId: alice.id, role: "member" });

    // Acting in group B, she targets group A's match. Her per-match organizer
    // role on matchA must NOT grant her organizer power over signups in group B:
    // the handler 404s on the cross-group match before any update runs.
    const res = await app(persona(alice.id), { id: groupB.id }).fetch(
      new Request(`http://t/matches/${matchA.id}/signup/any-signup-id`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      }),
    );
    expect(res.status).toBe(404);
  });
});
