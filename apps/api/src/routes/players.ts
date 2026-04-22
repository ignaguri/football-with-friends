import { Hono } from "hono";
import { getServiceFactory } from "@repo/shared/services";
import { auth } from "../auth";
import { type AppVariables } from "../middleware/security";
import { groupContextMiddleware, requireCurrentGroup } from "../middleware/group-context";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", groupContextMiddleware);

const getPlayerStatsService = () => getServiceFactory().playerStatsService;
const getRankingService = () => getServiceFactory().rankingService;

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

// Get finished matches for current user (for "My Info" self-service stats entry)
app.get("/me/finished-matches", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const current = requireCurrentGroup(c);
    const matches = await getPlayerStatsService().getFinishedMatchesForUser(
      current.id,
      session.user.id,
    );
    return c.json(matches);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to get finished matches";
    return c.json({ error: message }, 500);
  }
});

// Get voting statistics for a player
app.get("/:userId/voting-stats", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = c.req.param("userId");
  const language = c.req.header("Accept-Language")?.startsWith("es") ? "es" : "en";

  try {
    const stats = await getRankingService().getPlayerVotingStats(userId, language);
    return c.json(stats);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get voting stats";
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
