import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Kysely } from "kysely";

import { makeTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { TursoGroupCreationRequestRepository } from "@repo/shared/repositories";

let db: Kysely<any>;
let cleanup: () => Promise<void>;
let repo: TursoGroupCreationRequestRepository;

beforeAll(async () => {
  const harness = await makeTestDb();
  db = harness.db;
  cleanup = harness.cleanup;
  repo = new TursoGroupCreationRequestRepository();
});

afterAll(async () => {
  await cleanup();
});

describe("TursoGroupCreationRequestRepository", () => {
  test("create + findPendingByUser + listByUser", async () => {
    const user = await seedUser(db);
    const created = await repo.create({
      requestedByUserId: user.id,
      name: "Sunday League",
      reason: "Weekly games with coworkers",
    });
    expect(created.status).toBe("pending");
    expect(created.id.startsWith("gcr_")).toBe(true);

    const pending = await repo.findPendingByUser(user.id);
    expect(pending?.id).toBe(created.id);

    const mine = await repo.listByUser(user.id);
    expect(mine.map((r) => r.id)).toContain(created.id);
  });

  test("markDecided stamps decision fields and clears pending", async () => {
    const user = await seedUser(db);
    const req = await repo.create({
      requestedByUserId: user.id,
      name: "Padel Crew",
      reason: "padel",
    });
    const decided = await repo.markDecided(req.id, {
      status: "rejected",
      decisionReason: "duplicate of an existing group",
      decidedByUserId: user.id,
    });
    expect(decided.status).toBe("rejected");
    expect(decided.decisionReason).toBe("duplicate of an existing group");
    expect(await repo.findPendingByUser(user.id)).toBeNull();
  });

  test("listByStatus returns only matching rows", async () => {
    const pending = await repo.listByStatus("pending");
    expect(pending.every((r) => r.status === "pending")).toBe(true);
  });

  test("deletePending removes only the caller's pending row", async () => {
    const user = await seedUser(db);
    const other = await seedUser(db);
    const req = await repo.create({
      requestedByUserId: user.id,
      name: "Five-a-side",
      reason: "fun",
    });
    expect(await repo.deletePending(req.id, other.id)).toBe(false); // not owner
    expect(await repo.deletePending(req.id, user.id)).toBe(true);
    expect(await repo.findPendingByUser(user.id)).toBeNull();
  });
});
