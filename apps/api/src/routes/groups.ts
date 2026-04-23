// Group management API (Phase 2).
//
// Layout note: `GET /api/groups/me` is the only endpoint that does NOT run
// through `groupContextMiddleware` — it's the endpoint that powers the
// switcher itself, so it must work before we know which group to pin.
// We register /me first, then mount the middleware, then register everything
// scoped-by-path.

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getServiceFactory } from "@repo/shared/services";
import { MEMBER_ROLES } from "@repo/shared/domain";
import { type AppVariables, requireUser } from "../middleware/security";
import {
  groupContextMiddleware,
  requireCurrentGroup,
} from "../middleware/group-context";
import {
  assertInCurrentGroup,
  isSuperadmin,
  requireOrganizer,
  requireOwner,
  requireSuperadmin,
} from "../middleware/authz";

const app = new Hono<{ Variables: AppVariables }>();

const getGroupService = () => getServiceFactory().groupService;

// List my groups — public-to-authed-user, no X-Group-Id required.
app.get("/me", async (c) => {
  const user = requireUser(c);
  const groups = await getGroupService().listMyGroups(user.id);
  return c.json({ groups });
});

// Create a new group (superadmin only for now).
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(120),
      slug: z
        .string()
        .regex(/^[a-z0-9-]+$/i, "slug must be URL-safe")
        .max(48)
        .optional(),
    }),
  ),
  async (c) => {
    const denied = requireSuperadmin(c);
    if (denied) return denied;

    const user = requireUser(c);
    const data = c.req.valid("json");

    try {
      const group = await getGroupService().createGroup({
        ownerUserId: user.id,
        name: data.name,
        slug: data.slug,
      });
      return c.json({ group }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create group";
      return c.json({ error: message }, 400);
    }
  },
);

// Everything below is group-scoped — we validate :id matches the active
// group (or the caller is superadmin) so a member of group A can't probe
// group B by swapping the path parameter. `/me` and the create endpoint
// above bypass this because they're the switcher/bootstrap entry points.
app.use("*", groupContextMiddleware);

// Group details. Organizers get the full roster + settings; members get a
// stripped {id, name, slug, visibility, myRole} payload and the service
// skips the member/settings queries to avoid hydrating data we'll drop.
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const mismatched = assertInCurrentGroup(c, id, "Group not found");
  if (mismatched) return mismatched;

  const current = requireCurrentGroup(c);
  const isOrganizerView = current.role === "organizer" || isSuperadmin(c);

  if (isOrganizerView) {
    const details = await getGroupService().getGroupDetails(id);
    if (!details) return c.json({ error: "Group not found" }, 404);
    return c.json({ group: details });
  }

  const group = await getGroupService().getGroupBasics(id);
  if (!group) return c.json({ error: "Group not found" }, 404);
  return c.json({
    group: {
      id: group.id,
      name: group.name,
      slug: group.slug,
      visibility: group.visibility,
      myRole: current.role,
    },
  });
});

app.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(120).optional(),
      slug: z.string().regex(/^[a-z0-9-]+$/i).max(48).optional(),
      visibility: z.enum(["private", "public"]).optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param("id");
    const mismatched = assertInCurrentGroup(c, id, "Group not found");
    if (mismatched) return mismatched;

    const denied = requireOrganizer(c);
    if (denied) return denied;

    // Visibility toggling is gated behind superadmin until we ship the
    // public-directory flow (Phase 5); see the design doc.
    const updates = c.req.valid("json");
    if (updates.visibility !== undefined && !isSuperadmin(c)) {
      return c.json({ error: "Only superadmin can change visibility" }, 403);
    }

    try {
      const group = await getGroupService().updateGroup(id, updates);
      return c.json({ group });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update group";
      return c.json({ error: message }, 400);
    }
  },
);

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const mismatched = assertInCurrentGroup(c, id, "Group not found");
  if (mismatched) return mismatched;

  const denied = requireOwner(c);
  if (denied) return denied;

  try {
    await getGroupService().softDeleteGroup(id);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete group";
    return c.json({ error: message }, 400);
  }
});

// Members ------------------------------------------------------------------

app.get("/:id/members", async (c) => {
  const id = c.req.param("id");
  const mismatched = assertInCurrentGroup(c, id, "Group not found");
  if (mismatched) return mismatched;

  const denied = requireOrganizer(c);
  if (denied) return denied;

  const members = await getGroupService().listMembers(id);
  return c.json({ members });
});

app.patch(
  "/:id/members/:userId",
  zValidator("json", z.object({ role: z.enum(MEMBER_ROLES) })),
  async (c) => {
    const id = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const mismatched = assertInCurrentGroup(c, id, "Group not found");
    if (mismatched) return mismatched;

    const denied = requireOwner(c);
    if (denied) return denied;

    const { role } = c.req.valid("json");

    try {
      await getGroupService().updateMemberRole(id, targetUserId, role);
      return c.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update member";
      return c.json({ error: message }, 400);
    }
  },
);

app.delete("/:id/members/:userId", async (c) => {
  const id = c.req.param("id");
  const targetUserId = c.req.param("userId");
  const mismatched = assertInCurrentGroup(c, id, "Group not found");
  if (mismatched) return mismatched;

  const denied = requireOrganizer(c);
  if (denied) return denied;

  try {
    await getGroupService().removeMember(id, targetUserId);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove member";
    return c.json({ error: message }, 400);
  }
});

app.post("/:id/leave", async (c) => {
  const id = c.req.param("id");
  const mismatched = assertInCurrentGroup(c, id, "Group not found");
  if (mismatched) return mismatched;

  const user = requireUser(c);

  try {
    await getGroupService().leaveGroup(id, user.id);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to leave group";
    return c.json({ error: message }, 400);
  }
});

// Invites ----------------------------------------------------------------
// Creation and revocation are organizer-only; listing is organizer-only.
// Public preview/accept endpoints live in `routes/invites.ts` (no group
// context middleware — the accepter doesn't yet belong to the group).

app.get("/:id/invites", async (c) => {
  const id = c.req.param("id");
  const mismatched = assertInCurrentGroup(c, id, "Group not found");
  if (mismatched) return mismatched;

  const denied = requireOrganizer(c);
  if (denied) return denied;

  const invites = await getGroupService().listInvites(id);
  return c.json({ invites });
});

app.post(
  "/:id/invites",
  zValidator(
    "json",
    z.object({
      expiresInHours: z.number().int().positive().max(24 * 365).optional(),
      maxUses: z.number().int().positive().max(10_000).optional(),
      targetPhone: z.string().min(4).max(32).optional(),
      targetUserId: z.string().min(1).optional(),
    }),
  ),
  async (c) => {
    const id = c.req.param("id");
    const mismatched = assertInCurrentGroup(c, id, "Group not found");
    if (mismatched) return mismatched;

    const denied = requireOrganizer(c);
    if (denied) return denied;

    const user = requireUser(c);
    const body = c.req.valid("json");

    try {
      const invite = await getGroupService().createInvite({
        groupId: id,
        createdByUserId: user.id,
        expiresInHours: body.expiresInHours,
        maxUses: body.maxUses,
        targetPhone: body.targetPhone,
        targetUserId: body.targetUserId,
      });
      return c.json({ invite }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create invite";
      return c.json({ error: message }, 400);
    }
  },
);

app.delete("/:id/invites/:inviteId", async (c) => {
  const id = c.req.param("id");
  const inviteId = c.req.param("inviteId");
  const mismatched = assertInCurrentGroup(c, id, "Group not found");
  if (mismatched) return mismatched;

  const denied = requireOrganizer(c);
  if (denied) return denied;

  try {
    await getGroupService().revokeInvite(id, inviteId);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke invite";
    return c.json({ error: message }, 404);
  }
});

app.post(
  "/:id/transfer-ownership",
  zValidator("json", z.object({ toUserId: z.string().min(1) })),
  async (c) => {
    const id = c.req.param("id");
    const mismatched = assertInCurrentGroup(c, id, "Group not found");
    if (mismatched) return mismatched;

    const denied = requireOwner(c);
    if (denied) return denied;

    const user = requireUser(c);
    const { toUserId } = c.req.valid("json");

    try {
      await getGroupService().transferOwnership(id, user.id, toUserId);
      return c.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to transfer ownership";
      return c.json({ error: message }, 400);
    }
  },
);

export default app;
