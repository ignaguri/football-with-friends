// Group discovery + request-to-join. Authed but pre-membership: NO
// groupContextMiddleware (the requester isn't a member of the target group).

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getServiceFactory } from "@repo/shared/services";
import { type AppVariables, requireUser } from "../middleware/security";
import { fireAndForget } from "../lib/execution";
import { notifyOrganizersOfJoinRequest } from "../lib/notify";

const app = new Hono<{ Variables: AppVariables }>();

const getSvc = () => getServiceFactory().groupJoinRequestService;
const getGroupSvc = () => getServiceFactory().groupService;

app.get("/search", async (c) => {
  const user = requireUser(c);
  const q = c.req.query("q") ?? "";
  const results = await getSvc().searchGroups(q, user.id);
  return c.json({ results });
});

app.post(
  "/groups/:id/join-requests",
  zValidator("json", z.object({ message: z.string().trim().max(500).optional() })),
  async (c) => {
    const user = requireUser(c);
    const groupId = c.req.param("id");
    const { message } = c.req.valid("json");

    const outcome = await getSvc().submitJoinRequest({ groupId, userId: user.id, message });
    if (!outcome.ok) {
      if (outcome.reason === "not_public") return c.json({ error: "Group not found" }, 404);
      if (outcome.reason === "already_member")
        return c.json({ error: "You are already a member" }, 409);
      return c.json({ error: "You already have a pending request" }, 409);
    }

    // Fetch group basics for the organizer notification (group exists since submit succeeded).
    const group = await getGroupSvc().getGroupBasics(groupId);
    if (group) {
      fireAndForget(
        c,
        notifyOrganizersOfJoinRequest({ id: group.id, name: group.name }, user.name),
      );
    }
    return c.json({ request: outcome.request }, 201);
  },
);

app.get("/my-join-requests", async (c) => {
  const user = requireUser(c);
  const requests = await getSvc().listForUser(user.id);
  return c.json({ requests });
});

app.delete("/join-requests/:id", async (c) => {
  const user = requireUser(c);
  const id = c.req.param("id");
  const cancelled = await getSvc().cancel(id, user.id);
  if (!cancelled) return c.json({ error: "Request not found" }, 404);
  return c.json({ success: true });
});

export default app;
