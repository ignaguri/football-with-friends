// Public + authed invite entry points.
//
// `GET /api/invites/:token` is intentionally public — it's what the /join
// landing page hits before auth. `POST /:token/accept` is authed but does
// NOT run through `groupContextMiddleware` because the accepter may not yet
// belong to any group.

import { Hono } from "hono";
import { getServiceFactory } from "@repo/shared/services";

import { type AppVariables, requireUser } from "../middleware/security";

const app = new Hono<{ Variables: AppVariables }>();

const getGroupService = () => getServiceFactory().groupService;

app.get("/:token", async (c) => {
  const preview = await getGroupService().getInvitePreview(c.req.param("token"));
  return c.json(preview);
});

app.post("/:token/accept", async (c) => {
  const user = requireUser(c);
  const outcome = await getGroupService().acceptInvite({
    token: c.req.param("token"),
    userId: user.id,
  });
  if (!outcome.joined) {
    return c.json({ error: outcome.reason, joined: false }, 400);
  }
  return c.json(outcome);
});

export default app;
