import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Kysely } from "kysely";

import { makeTestDb } from "../helpers/db";
import {
  seedGroup,
  seedLocation,
  seedMatch,
  seedMembership,
  seedUser,
} from "../helpers/fixtures";
import { ServiceFactory, resetServiceFactory } from "@repo/shared/services";

let db: Kysely<any>;
let cleanup: () => Promise<void>;
let service: ServiceFactory["matchService"];
let groupService: ServiceFactory["groupService"];

beforeAll(async () => {
  const harness = await makeTestDb();
  db = harness.db;
  cleanup = harness.cleanup;
  resetServiceFactory();
  const factory = new ServiceFactory();
  service = factory.matchService;
  groupService = factory.groupService;
});

afterAll(async () => {
  await cleanup();
});

async function setupMatch() {
  const owner = await seedUser(db);
  const group = await seedGroup(db, { ownerUserId: owner.id });
  const loc = await seedLocation(db, { groupId: group.id });
  const match = await seedMatch(db, {
    locationId: loc.id,
    groupId: group.id,
    createdByUserId: owner.id,
  });
  return { owner, group, match };
}

describe("MatchService.assignOrganizer", () => {
  test("assigns a current group member", async () => {
    const { group, match } = await setupMatch();
    const member = await seedUser(db);
    await seedMembership(db, { groupId: group.id, userId: member.id, role: "member" });
    const updated = await service.assignOrganizer(group.id, match.id, member.id);
    expect(updated.organizerUserId).toBe(member.id);
  });

  test("rejects a non-member", async () => {
    const { group, match } = await setupMatch();
    const stranger = await seedUser(db);
    await expect(service.assignOrganizer(group.id, match.id, stranger.id)).rejects.toThrow(
      /not a member/i,
    );
  });

  test("rejects a match from another group", async () => {
    const { match } = await setupMatch();
    const otherOwner = await seedUser(db);
    const otherGroup = await seedGroup(db, { ownerUserId: otherOwner.id });
    await expect(service.assignOrganizer(otherGroup.id, match.id, otherOwner.id)).rejects.toThrow(
      /match not found/i,
    );
  });
});

describe("MatchService.clearOrganizer", () => {
  test("nulls the organizer", async () => {
    const { group, match } = await setupMatch();
    const member = await seedUser(db);
    await seedMembership(db, { groupId: group.id, userId: member.id, role: "member" });
    await service.assignOrganizer(group.id, match.id, member.id);
    const cleared = await service.clearOrganizer(group.id, match.id);
    expect(cleared.organizerUserId).toBeUndefined();
  });
});

describe("organizer cleanup on member removal", () => {
  test("removing a member clears their per-match organizer assignment", async () => {
    const { group, match } = await setupMatch();
    const member = await seedUser(db);
    await seedMembership(db, { groupId: group.id, userId: member.id, role: "member" });
    await service.assignOrganizer(group.id, match.id, member.id);

    // Member leaves the group -> the stale organizer pointer must be dropped so
    // it can't silently re-grant management rights if they rejoin.
    await groupService.removeMember(group.id, member.id);

    const after = await service.getMatchDetails(match.id);
    expect(after?.organizerUserId).toBeUndefined();
  });
});
