import { zValidator } from "@hono/zod-validator";
import { PUSH_TOKEN_PLATFORMS } from "@repo/shared/domain";
import { getServiceFactory } from "@repo/shared/services";
import { Hono } from "hono";
import { z } from "zod";

import { type AppVariables, requireUser } from "../middleware/security";

const app = new Hono<{ Variables: AppVariables }>();

const getNotificationService = () => getServiceFactory().notificationService;

// Register a push token for the authenticated user
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      token: z.string().min(1),
      platform: z.enum(PUSH_TOKEN_PLATFORMS),
      deviceId: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = requireUser(c);
    const { token, platform, deviceId } = c.req.valid("json");

    try {
      const pushToken = await getNotificationService().registerToken({
        userId: user.id,
        token,
        platform,
        deviceId,
      });

      return c.json({ success: true, id: pushToken.id });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to register push token";
      return c.json({ error: message }, 400);
    }
  },
);

// Unregister a push token
app.delete(
  "/",
  zValidator(
    "json",
    z.object({
      token: z.string().min(1),
    }),
  ),
  async (c) => {
    const user = requireUser(c);
    const { token } = c.req.valid("json");

    try {
      await getNotificationService().unregisterToken(token, user.id);
      return c.json({ success: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to unregister push token";
      return c.json({ error: message }, 403);
    }
  },
);

export default app;
