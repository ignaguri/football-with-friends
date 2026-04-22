// Group-relative authorization helpers. These replace the old global
// `user.role === "admin"` check. They run inside a handler (not as middleware)
// because they need the active group already bound by groupContextMiddleware.
//
// Semantics:
//   - requireOrganizer: organizer role in the current group OR platform superadmin.
//   - requireOwner:     owner of the current group OR platform superadmin.
//   - requireMember:    any member of the current group. Middleware already
//                       enforces this; the function is exported for explicit
//                       self-documentation at call sites that want to signal
//                       "this endpoint is member-only by design".
//
// On failure each helper throws an HTTPException-equivalent JSON error via
// `c.json(...)` — callers should `return` whatever the helper returns.

import type { Context } from "hono";
import { requireCurrentGroup } from "./group-context";

function forbidden(c: Context, message: string) {
  return c.json({ error: message, code: "FORBIDDEN" }, 403);
}

/** Organizer of the current group OR superadmin. Returns null on success, a Response on failure. */
export function requireOrganizer(c: Context): Response | null {
  const isSuperadmin = c.get("isSuperadmin") === true;
  if (isSuperadmin) return null;
  const current = requireCurrentGroup(c);
  if (current.role === "organizer") return null;
  return forbidden(c, "Organizer role required for this action");
}

/** Owner of the current group OR superadmin. Returns null on success, a Response on failure. */
export function requireOwner(c: Context): Response | null {
  const isSuperadmin = c.get("isSuperadmin") === true;
  if (isSuperadmin) return null;
  const current = requireCurrentGroup(c);
  if (current.isOwner) return null;
  return forbidden(c, "Owner role required for this action");
}

/** Explicitly assert membership. Middleware already enforces this. */
export function requireMember(_c: Context): Response | null {
  return null;
}
