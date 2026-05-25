import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Kysely } from "kysely";
import { sql } from "kysely";

import { makeTestDb } from "../helpers/db";
import { seedGroup, seedUser } from "../helpers/fixtures";

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

describe("group_join_requests migration", () => {
  test("table exists", async () => {
    const rows = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='group_join_requests'
    `.execute(db);
    expect(rows.rows.length).toBe(1);
  });

  test("one-pending-per-user-group partial unique index holds", async () => {
    const owner = await seedUser(db);
    const group = await seedGroup(db, { ownerUserId: owner.id });
    const user = await seedUser(db);
    const insert = (id: string, status: string) =>
      db
        .insertInto("group_join_requests")
        .values({ id, group_id: group.id, requested_by_user_id: user.id, status })
        .execute();

    await insert("gjr_a", "pending");
    await expect(insert("gjr_b", "pending")).rejects.toThrow();
    await insert("gjr_c", "rejected"); // decided rows don't collide
  });
});
