import { zValidator } from "@hono/zod-validator";
import { getServiceFactory } from "@repo/shared/services";
import { Hono } from "hono";
import { z } from "zod";

import { type AppVariables, requireUser } from "../middleware/security";

const app = new Hono<{ Variables: AppVariables }>();

const getNotificationService = () => getServiceFactory().notificationService;

// Send a test notification (admin only)
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
      return c.json(
        { error: "Only platform admin can send test notifications" },
        403,
      );
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
      const message =
        error instanceof Error ? error.message : "Failed to send notification";
      return c.json({ error: message }, 400);
    }
  },
);

export default app;
