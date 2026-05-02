// Binds the active group to every scoped request via the `X-Group-Id` header.
// The server is stateless: the client names the group on each request and we
// validate membership. The resolved id is echoed back so the client can sync
// when we fell back to an auto-picked group (first login, cleared storage).
//
// Platform-admin shortcut: platform admins (only Ignacio today) can pin any
// existing group via an explicit header, even without a membership row —
// keeps debugging/impersonation paths simple.

import type { Context, Next } from "hono";
import { GROUP_HEADER } from "@repo/shared/domain";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { requireUser, type CurrentGroup } from "./security";

export async function groupContextMiddleware(c: Context, next: Next) {
  const user = requireUser(c);
  const isPlatformAdmin = user.role === "admin";

  const factory = getRepositoryFactory();
  const requestedGroupId = c.req.header(GROUP_HEADER)?.trim() || null;

  let current: CurrentGroup | null = null;

  if (requestedGroupId) {
    const membership = await factory.groups.findMembership(requestedGroupId, user.id);
    if (membership) {
      current = membership;
    } else if (isPlatformAdmin) {
      const group = await factory.groups.findById(requestedGroupId);
      if (!group) {
        return c.json({ error: "Group not found", code: "GROUP_NOT_FOUND" }, 404);
      }
      current = { id: group.id, role: "organizer", isOwner: true };
    } else {
      return c.json({ error: "Not a member of this group", code: "FORBIDDEN_GROUP" }, 403);
    }
  } else {
    current = await factory.groups.findFirstMembership(user.id);
    if (!current) {
      return c.json({ error: "You do not belong to any group", code: "NO_GROUP" }, 409);
    }
  }

  c.set("currentGroup", current);
  c.header(GROUP_HEADER, current.id);

  return next();
}

/**
 * Throws if middleware didn't run. Call at the top of every scoped handler.
 */
export function requireCurrentGroup(c: Context): CurrentGroup {
  const current = c.get("currentGroup") as CurrentGroup | undefined;
  if (!current) {
    throw new Error("groupContextMiddleware did not run for this request — check route mounting.");
  }
  return current;
}
