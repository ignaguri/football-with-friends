// Self-serve group creation requests. Pre-group: NO groupContextMiddleware.
// Submit + read-own are open to any authed user; list/approve/reject are
// platform-admin only. Approval delegates to GroupService.createGroup via the
// request service.

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getServiceFactory } from "@repo/shared/services";
import { type AppVariables, requireUser } from "../middleware/security";
import { requirePlatformAdmin } from "../middleware/authz";
import { fireAndForget } from "../lib/execution";
import {
  notifyAdminOfGroupRequest,
  notifyRequesterApproved,
  notifyRequesterRejected,
} from "../lib/notify";

const app = new Hono<{ Variables: AppVariables }>();

const getSvc = () => getServiceFactory().groupRequestService;

// Submit a request — any authed user. 409 if one is already pending.
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().trim().min(1).max(120),
      reason: z.string().trim().min(1).max(500),
    }),
  ),
  async (c) => {
    const user = requireUser(c);
    const { name, reason } = c.req.valid("json");

    const outcome = await getSvc().submit({ userId: user.id, name, reason });
    if (!outcome.ok) {
      return c.json({ error: "You already have a pending request" }, 409);
    }
    fireAndForget(c, notifyAdminOfGroupRequest({ requesterName: user.name, groupName: name }));
    return c.json({ request: outcome.request }, 201);
  },
);

// The caller's own requests (for the status screen).
app.get("/me", async (c) => {
  const user = requireUser(c);
  const requests = await getSvc().listForUser(user.id);
  return c.json({ requests });
});

// Review queue — platform admin only.
app.get("/", async (c) => {
  const denied = requirePlatformAdmin(c);
  if (denied) return denied;
  const requests = await getSvc().listPending();
  return c.json({ requests });
});

app.post("/:id/approve", async (c) => {
  const denied = requirePlatformAdmin(c);
  if (denied) return denied;
  const user = requireUser(c);
  const id = c.req.param("id");
  try {
    const { group } = await getSvc().approve(id, user.id);
    fireAndForget(c, notifyRequesterApproved({ userId: group.ownerUserId, group }));
    return c.json({ group });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve request";
    return c.json({ error: message }, 400);
  }
});

app.post(
  "/:id/reject",
  zValidator("json", z.object({ reason: z.string().trim().min(1).max(500) })),
  async (c) => {
    const denied = requirePlatformAdmin(c);
    if (denied) return denied;
    const user = requireUser(c);
    const id = c.req.param("id");
    const { reason } = c.req.valid("json");
    try {
      const request = await getSvc().reject(id, user.id, reason);
      fireAndForget(c, notifyRequesterRejected({ userId: request.requestedByUserId, reason }));
      return c.json({ request });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reject request";
      return c.json({ error: message }, 400);
    }
  },
);

// Cancel the caller's own pending request so they can resubmit immediately.
app.delete("/:id", async (c) => {
  const user = requireUser(c);
  const id = c.req.param("id");
  const cancelled = await getSvc().cancel(id, user.id);
  if (!cancelled) return c.json({ error: "Request not found" }, 404);
  return c.json({ success: true });
});

export default app;
