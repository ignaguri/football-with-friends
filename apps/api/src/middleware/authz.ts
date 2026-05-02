// Group-relative authorization helpers. These replace the old global
// `user.role === "admin"` check. Called inside handlers (not as middleware)
// because they depend on the active group bound by groupContextMiddleware.
//
// Semantics:
//   - requirePlatformAdmin: platform-level admin only (cross-group escape).
//   - requireOrganizer:     organizer of the current group OR platform admin.
//   - requireOwner:         owner of the current group OR platform admin.
//   - requireMember:        any member — middleware already enforces this.
//
// Each returns null on success or a 403 `Response` on failure. Handlers:
//   const denied = requireOrganizer(c);
//   if (denied) return denied;

import type { Context } from "hono";
import { requireCurrentGroup } from "./group-context";
import { requireUser } from "./security";

function forbidden(c: Context, message: string): Response {
  return c.json({ error: message, code: "FORBIDDEN" }, 403);
}

export function isPlatformAdmin(c: Context): boolean {
  return requireUser(c).role === "admin";
}

export function isCurrentOrganizer(c: Context): boolean {
  if (isPlatformAdmin(c)) return true;
  return requireCurrentGroup(c).role === "organizer";
}

export function requirePlatformAdmin(c: Context): Response | null {
  return isPlatformAdmin(c) ? null : forbidden(c, "Platform admin role required");
}

export function requireOrganizer(c: Context): Response | null {
  return isCurrentOrganizer(c) ? null : forbidden(c, "Organizer role required for this action");
}

export function requireOwner(c: Context): Response | null {
  if (isPlatformAdmin(c)) return null;
  return requireCurrentGroup(c).isOwner
    ? null
    : forbidden(c, "Owner role required for this action");
}

export function requireMember(_c: Context): Response | null {
  return null;
}

/**
 * Asserts that a group-scoped entity (or a bare group id) matches the
 * caller's current group. Returns a 404 `Response` on mismatch
 * (intentionally 404 not 403 to avoid id-existence leakage across groups).
 * Returns null on success. Platform admin bypasses the check since their
 * current-group binding is already chosen explicitly via X-Group-Id.
 */
export function assertInCurrentGroup(
  c: Context,
  entityOrId: { groupId: string } | string | null | undefined,
  notFoundMessage = "Not found",
): Response | null {
  const current = requireCurrentGroup(c);
  const groupId = typeof entityOrId === "string" ? entityOrId : entityOrId?.groupId;
  if (!groupId) {
    return c.json({ error: notFoundMessage }, 404);
  }
  if (groupId !== current.id && !isPlatformAdmin(c)) {
    return c.json({ error: notFoundMessage }, 404);
  }
  return null;
}
