import { Hono } from "hono";
import { getServiceFactory } from "@repo/shared/services";
import { auth } from "../auth";
import type { RankingCriteria } from "@repo/shared/domain";

const app = new Hono();

const getRankingService = () => getServiceFactory().rankingService;

// Get player rankings by criteria
app.get("/", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { criteria = "matches", limit = "50" } = c.req.query();
    const rankings = await getRankingService().getPlayerRankings(
      criteria as RankingCriteria,
      parseInt(limit, 10)
    );
    return c.json(rankings);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get rankings";
    return c.json({ error: message }, 500);
  }
});

export default app;
