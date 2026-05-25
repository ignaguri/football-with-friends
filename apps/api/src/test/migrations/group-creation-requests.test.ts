// Verifies the group_creation_requests table is created by makeTestDb (which
// runs all migrations) and that its one-pending partial unique index holds.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Kysely } from "kysely";
import { sql } from "kysely";

import { makeTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";

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

describe("group_creation_requests migration", () => {
  test("table exists after migrations run", async () => {
    const rows = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='group_creation_requests'
    `.execute(db);
    expect(rows.rows.length).toBe(1);
  });

  test("partial unique index blocks a second pending row for the same user", async () => {
    const user = await seedUser(db);
    const insert = (id: string, status: string) =>
      db
        .insertInto("group_creation_requests")
        .values({
          id,
          requested_by_user_id: user.id,
          name: "Test",
          reason: "because",
          status,
        })
        .execute();

    await insert("gcr_a", "pending");
    await expect(insert("gcr_b", "pending")).rejects.toThrow();
    // A decided row does not collide with a new pending one.
    await insert("gcr_c", "rejected");
  });
});
