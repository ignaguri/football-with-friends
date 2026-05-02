import { zValidator } from "@hono/zod-validator";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { getServiceFactory } from "@repo/shared/services";
import { Hono } from "hono";
import { z } from "zod";

import { groupContextMiddleware, requireCurrentGroup } from "../middleware/group-context";
import { type AppVariables, requireUser } from "../middleware/security";

const app = new Hono<{ Variables: AppVariables }>();

const getNotificationService = () => getServiceFactory().notificationService;
const getInbox = () => getRepositoryFactory().notificationInbox;

// Group-scoping middleware applies only to inbox endpoints that read or
// mutate group-scoped state. /send-test (admin) and /:id/read (ownership
// by user_id) intentionally don't require a current group.

// List inbox notifications for the current user in the current group.
app.get(
  "/",
  groupContextMiddleware,
  zValidator(
    "query",
    z.object({
      limit: z.coerce.number().int().positive().max(100).optional(),
      before: z.string().min(1).max(200).optional(),
    }),
  ),
  async (c) => {
    const user = requireUser(c);
    const current = requireCurrentGroup(c);
    const { limit, before } = c.req.valid("query");

    const list = await getInbox().listByUserAndGroup(user.id, current.id, {
      limit,
      before,
    });

    return c.json({
      items: list.items,
      hasMore: list.hasMore,
      nextCursor: list.nextCursor,
    });
  },
);

// Lightweight unread count — used to drive the home-screen bell badge.
app.get("/unread-count", groupContextMiddleware, async (c) => {
  const user = requireUser(c);
  const current = requireCurrentGroup(c);
  const unreadCount = await getInbox().unreadCount(user.id, current.id);
  return c.json({ unreadCount });
});

// Mark all unread rows in the current group as read.
app.post("/read-all", groupContextMiddleware, async (c) => {
  const user = requireUser(c);
  const current = requireCurrentGroup(c);
  const updated = await getInbox().markAllRead(user.id, current.id);
  return c.json({ updated });
});

// Mark a single inbox row as read. 404 if it isn't owned by the caller
// (or is already read) — ownership is enforced via the WHERE clause.
app.patch("/:id/read", async (c) => {
  const user = requireUser(c);
  const id = c.req.param("id");
  const ok = await getInbox().markRead(id, user.id);
  if (!ok) return c.json({ error: "Notification not found" }, 404);
  return c.json({ success: true });
});

// Send a test notification (admin only).
app.post(
  "/send-test",
  zValidator(
    "json",
    z.object({
      userId: z.string().optional(),
      title: z.string().optional(),
      body: z.string().min(1),
    }),
  ),
  async (c) => {
    const user = requireUser(c);
    if (user.role !== "admin") {
      return c.json({ error: "Only platform admin can send test notifications" }, 403);
    }

    const { userId, title, body } = c.req.valid("json");
    const targetUserId = userId || user.id;

    try {
      const tickets = await getNotificationService().sendToUser(targetUserId, {
        title,
        body,
      });

      return c.json({ success: true, tickets });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send notification";
      return c.json({ error: message }, 400);
    }
  },
);

export default app;
