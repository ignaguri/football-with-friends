// Level-2 middleware coverage. We build a mini Hono app that mounts ONLY
// groupContextMiddleware with a fake-user injector instead of BetterAuth —
// production security is untouched, we just bypass auth for test purposes.

import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import type { Kysely } from "kysely";

import { makeTestDb, PLATFORM_ADMIN_USER_ID } from "../helpers/db";
import { seedGroup, seedMembership, seedUser } from "../helpers/fixtures";
import { makeMiniApp, makeRequest } from "../helpers/app";
import type { SessionUser } from "../../middleware/security";

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

function asUser(user: { id: string; email?: string; role?: string; name?: string }) {
  const resolved: SessionUser = {
    id: user.id,
    email: user.email ?? `${user.id}@test.local`,
    name: user.name ?? "",
    role: (user.role as "user" | "admin") ?? "user",
  };
  return makeMiniApp({ resolveUser: () => resolved });
}

describe("groupContextMiddleware", () => {
  test("zero-group user → 409 NO_GROUP", async () => {
    const user = await seedUser(db);
    const app = asUser({ id: user.id });

    const res = await app.fetch(makeRequest("/scoped/echo"));
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("NO_GROUP");
  });

  test("member of A, X-Group-Id = A → 200 with ctx.currentGroup set", async () => {
    const owner = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id });
    const app = asUser({ id: owner.id });

    const res = await app.fetch(makeRequest("/scoped/echo", { groupId: group.id }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { currentGroup: { id: string } };
    expect(body.currentGroup.id).toBe(group.id);
    expect(res.headers.get("X-Group-Id")).toBe(group.id);
  });

  test("member of A, X-Group-Id = B → 403 FORBIDDEN_GROUP", async () => {
    const aliceA = await seedUser(db);
    const bob = await seedUser(db);
    const groupA = await seedGroup(db, { ownerUserId: aliceA.id });
    const groupB = await seedGroup(db, { ownerUserId: bob.id });
    // Alice is only in A.
    void groupA;

    const app = asUser({ id: aliceA.id });
    const res = await app.fetch(makeRequest("/scoped/echo", { groupId: groupB.id }));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("FORBIDDEN_GROUP");
  });

  test("platform admin, X-Group-Id = arbitrary existing group → 200", async () => {
    const alice = await seedUser(db);
    const bob = await seedUser(db);
    const groupB = await seedGroup(db, { ownerUserId: bob.id });
    void alice;

    // Platform admin is never a member of groupB, but the bypass grants access.
    const app = asUser({ id: PLATFORM_ADMIN_USER_ID, role: "admin" });
    const res = await app.fetch(makeRequest("/scoped/echo", { groupId: groupB.id }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      currentGroup: { id: string; role: string; isOwner: boolean };
    };
    expect(body.currentGroup.id).toBe(groupB.id);
    // Platform-admin bypass synthesises organizer+isOwner so downstream authz
    // checks pass without a real membership row.
    expect(body.currentGroup.role).toBe("organizer");
    expect(body.currentGroup.isOwner).toBe(true);
  });

  test("no X-Group-Id header → auto-picks first membership and echoes it back", async () => {
    const owner = await seedUser(db);
    // Create two groups for this user — findFirstMembership orders by
    // joined_at asc, so the first one seeded wins.
    const groupFirst = await seedGroup(db, { ownerUserId: owner.id });
    const groupSecond = await seedGroup(db, { ownerUserId: owner.id });
    void groupSecond;

    const app = asUser({ id: owner.id });
    const res = await app.fetch(makeRequest("/scoped/echo"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Group-Id")).toBe(groupFirst.id);
    const body = (await res.json()) as { currentGroup: { id: string } };
    expect(body.currentGroup.id).toBe(groupFirst.id);
  });

  test("X-Group-Id pointing at soft-deleted group → 404 for platform admin (findById filters deleted_at)", async () => {
    // Regular members hit 403 (no membership row survives), but platform admin
    // relies on findById which drops soft-deleted rows — so they should see
    // 404 instead.
    const owner = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id });
    await db
      .updateTable("groups")
      .set({ deleted_at: new Date().toISOString() })
      .where("id", "=", group.id)
      .execute();

    const app = asUser({ id: PLATFORM_ADMIN_USER_ID, role: "admin" });
    const res = await app.fetch(makeRequest("/scoped/echo", { groupId: group.id }));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("GROUP_NOT_FOUND");
  });
});
