import { Hono } from "hono";
import { updateMatchStatuses } from "../cron/update-match-statuses";

const app = new Hono();

/**
 * Manual trigger endpoint for testing cron jobs
 * POST /api/cron/update-matches
 *
 * Protected by CRON_SECRET bearer token
 */
app.post("/update-matches", async (c) => {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = c.req.header("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const result = await updateMatchStatuses();
    return c.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Manual trigger error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default app;
