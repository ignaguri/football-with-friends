// Binds the active group to every scoped request via the `X-Group-Id` header.
// The server is stateless with respect to "which group am I looking at": the
// client tells us on each request, and this middleware validates that the
// caller is a member. The header is also echoed back on the response so the
// client can sync when we fall back to an auto-picked group (first login,
// cleared storage, etc.).
//
// Superadmin shortcut: if the caller is a platform superadmin (Ignacio), we
// trust an explicit `X-Group-Id` even when there's no membership row — this
// keeps debugging / impersonation paths simple while keeping regular users
// strictly bound to groups they've actually joined.

import type { Context, Next } from "hono";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { requireUser, type CurrentGroup } from "./security";

export const GROUP_HEADER = "X-Group-Id";

export async function groupContextMiddleware(c: Context, next: Next) {
  const user = requireUser(c);
  const isSuperadmin = user.role === "superadmin";
  c.set("isSuperadmin", isSuperadmin);

  const factory = getRepositoryFactory();
  const requestedGroupId = c.req.header(GROUP_HEADER)?.trim() || null;

  let current: CurrentGroup | null = null;

  if (requestedGroupId) {
    const membership = await factory.groupMembers.find(requestedGroupId, user.id);

    if (membership) {
      const group = await factory.groups.findById(requestedGroupId);
      current = {
        id: requestedGroupId,
        role: membership.role,
        isOwner: group?.ownerUserId === user.id,
      };
    } else if (isSuperadmin) {
      // Trust superadmin with an explicit group id, but verify it exists so
      // we don't bind a ghost id onto the context.
      const group = await factory.groups.findById(requestedGroupId);
      if (!group) {
        return c.json(
          { error: "Group not found", code: "GROUP_NOT_FOUND" },
          404,
        );
      }
      current = {
        id: group.id,
        role: "organizer",
        isOwner: true,
      };
    } else {
      return c.json(
        { error: "Not a member of this group", code: "FORBIDDEN_GROUP" },
        403,
      );
    }
  } else {
    // No header — pick the user's oldest-joined group and echo it back so
    // the client can persist the choice for subsequent requests.
    const myGroups = await factory.groups.listByUserId(user.id);
    const first = myGroups[0];
    if (!first) {
      return c.json(
        { error: "You do not belong to any group", code: "NO_GROUP" },
        409,
      );
    }
    current = {
      id: first.id,
      role: first.myRole,
      isOwner: first.amIOwner,
    };
  }

  c.set("currentGroup", current);
  c.header(GROUP_HEADER, current.id);

  return next();
}

/**
 * Helper: get the resolved active group, throws if middleware didn't run.
 * Route handlers should call this at the top of every scoped endpoint.
 */
export function requireCurrentGroup(c: Context): CurrentGroup {
  const current = c.get("currentGroup") as CurrentGroup | undefined;
  if (!current) {
    throw new Error(
      "groupContextMiddleware did not run for this request — check route mounting.",
    );
  }
  return current;
}
