import { Hono } from "hono";
import { getServiceFactory } from "@repo/shared/services";
import { auth } from "../auth";

const app = new Hono();

const getPlayerStatsService = () => getServiceFactory().playerStatsService;

// Get all players with summary stats
app.get("/", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const players = await getPlayerStatsService().getAllPlayers();
    return c.json(players);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get players";
    return c.json({ error: message }, 500);
  }
});

// Get player profile with full stats
app.get("/:userId", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = c.req.param("userId");

  try {
    const profile = await getPlayerStatsService().getPlayerProfile(userId);
    if (!profile) {
      return c.json({ error: "Player not found" }, 404);
    }
    return c.json(profile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get player profile";
    return c.json({ error: message }, 500);
  }
});

export default app;
