import { Hono } from "hono";
import { getServiceFactory } from "@repo/shared/services";
import { auth } from "../auth";
import type { RankingCriteria } from "@repo/shared/domain";
import { type AppVariables } from "../middleware/security";
import { groupContextMiddleware } from "../middleware/group-context";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", groupContextMiddleware);

// NOTE: ranking aggregates currently span all groups. Scoping them to the
// active group is a follow-up — safe to defer because all production data
// lives in `grp_legacy` post-migration, so rankings are effectively
// correct. Tracked with the voting-scoping follow-up.

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
