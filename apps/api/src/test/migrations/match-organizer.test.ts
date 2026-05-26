import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Kysely } from "kysely";
import { sql } from "kysely";

import { makeTestDb } from "../helpers/db";

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

describe("add-match-organizer migration", () => {
  test("matches.organizer_user_id column exists", async () => {
    const info = await sql<{ name: string }>`PRAGMA table_info(matches)`.execute(db);
    expect(info.rows.some((c) => c.name === "organizer_user_id")).toBe(true);
  });
});
