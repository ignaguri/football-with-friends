import { Hono } from "hono";
import { getServiceFactory } from "@repo/shared/services";
import type { RankingCriteria } from "@repo/shared/domain";
import { type AppVariables } from "../middleware/security";
import { groupContextMiddleware, requireCurrentGroup } from "../middleware/group-context";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", groupContextMiddleware);

const getRankingService = () => getServiceFactory().rankingService;

// Get player rankings by criteria, scoped to the active group.
app.get("/", async (c) => {
  try {
    const current = requireCurrentGroup(c);
    const { criteria = "matches", limit = "50" } = c.req.query();
    const rankings = await getRankingService().getPlayerRankings(
      current.id,
      criteria as RankingCriteria,
      parseInt(limit, 10),
    );
    return c.json(rankings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get rankings";
    return c.json({ error: message }, 500);
  }
});

export default app;
