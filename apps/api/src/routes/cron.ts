import { Hono } from "hono";
import { updateMatchStatuses } from "../cron/update-match-statuses";
import { sendMatchReminders } from "../cron/send-match-reminders";
import { sendEngagementReminders } from "../cron/send-engagement-reminders";
import { pruneInboxNotifications } from "../cron/prune-inbox-notifications";

const app = new Hono();

function verifyCronSecret(c: any): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = c.req.header("Authorization");
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

app.post("/update-matches", async (c) => {
  if (!verifyCronSecret(c)) return c.json({ error: "Unauthorized" }, 401);

  try {
    const result = await updateMatchStatuses();
    return c.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[CRON] Manual trigger error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

app.post("/send-reminders", async (c) => {
  if (!verifyCronSecret(c)) return c.json({ error: "Unauthorized" }, 401);

  try {
    const result = await sendMatchReminders();
    return c.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[CRON] Manual trigger error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

app.post("/prune-inbox", async (c) => {
  if (!verifyCronSecret(c)) return c.json({ error: "Unauthorized" }, 401);

  try {
    const result = await pruneInboxNotifications({ force: true });
    return c.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[CRON] Manual trigger error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

app.post("/send-engagement", async (c) => {
  if (!verifyCronSecret(c)) return c.json({ error: "Unauthorized" }, 401);

  try {
    const result = await sendEngagementReminders();
    return c.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[CRON] Manual trigger error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

export default app;
