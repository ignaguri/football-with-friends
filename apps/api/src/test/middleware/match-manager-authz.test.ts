import { describe, expect, test } from "bun:test";
import type { Context } from "hono";

import { isMatchManager } from "../../middleware/authz";

function ctx(
  user: { id: string; role: "user" | "admin" },
  currentGroup?: { id: string; role: "organizer" | "member"; isOwner: boolean },
): Context {
  return {
    get: (k: string) => (k === "user" ? user : k === "currentGroup" ? currentGroup : undefined),
  } as unknown as Context;
}

describe("isMatchManager", () => {
  test("group organizer manages any match", () => {
    const c = ctx({ id: "u1", role: "user" }, { id: "g1", role: "organizer", isOwner: false });
    expect(isMatchManager(c, { organizerUserId: null })).toBe(true);
  });

  test("platform admin manages any match", () => {
    const c = ctx({ id: "admin", role: "admin" });
    expect(isMatchManager(c, { organizerUserId: null })).toBe(true);
  });

  test("assigned member manages their own match", () => {
    const c = ctx({ id: "u2", role: "user" }, { id: "g1", role: "member", isOwner: false });
    expect(isMatchManager(c, { organizerUserId: "u2" })).toBe(true);
  });

  test("plain member cannot manage a match they don't organize", () => {
    const c = ctx({ id: "u3", role: "user" }, { id: "g1", role: "member", isOwner: false });
    expect(isMatchManager(c, { organizerUserId: "u2" })).toBe(false);
    expect(isMatchManager(c, { organizerUserId: null })).toBe(false);
  });
});
