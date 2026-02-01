import { Hono } from "hono";
import { updateMatchStatuses } from "../cron/update-match-statuses";

const app = new Hono();

/**
 * Manual trigger endpoint for testing cron jobs
 * POST /api/cron/update-matches
 *
 * TODO: Add authentication (admin only or secret token)
 */
app.post("/update-matches", async (c) => {
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
