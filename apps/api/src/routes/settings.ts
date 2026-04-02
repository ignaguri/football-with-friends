import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDatabase } from "@repo/shared/database";
import { DEFAULT_SETTINGS, type AppSettings, type SettingKey } from "@repo/shared/domain";

type SessionUser = { id: string; email: string; name: string; role: string };

const app = new Hono<{ Variables: { user: SessionUser } }>();

// Get all settings
app.get("/", async (c) => {
  const db = getDatabase();

  try {
    const rows = await db
      .selectFrom("settings")
      .selectAll()
      .execute();

    // Build settings object from rows, using defaults for missing keys
    const settings: AppSettings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (row.key in settings) {
        settings[row.key as SettingKey] = row.value;
      }
    }

    return c.json(settings);
  } catch (error) {
    // If settings table doesn't exist yet, return defaults
    console.error("Error fetching settings:", error);
    return c.json(DEFAULT_SETTINGS);
  }
});

// Update settings (admin only)
app.patch(
  "/",
  zValidator(
    "json",
    z.object({
      default_cost_per_player: z.string().optional(),
      same_day_extra_cost: z.string().optional(),
      default_max_substitutes: z.string().optional(),
      paypal_url: z.string().optional(),
      organizer_whatsapp: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user") as { id: string; name: string; email: string; role: string };
    if (user.role !== "admin") {
      return c.json({ error: "Only administrators can update settings" }, 403);
    }

    const updates = c.req.valid("json");
    const db = getDatabase();

    try {
      // Update each provided setting
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          // Upsert: insert or update on conflict
          await db
            .insertInto("settings")
            .values({
              key,
              value,
              updated_at: new Date().toISOString(),
            })
            .onConflict((oc) =>
              oc.column("key").doUpdateSet({
                value,
                updated_at: new Date().toISOString(),
              })
            )
            .execute();
        }
      }

      // Return updated settings
      const rows = await db.selectFrom("settings").selectAll().execute();
      const settings: AppSettings = { ...DEFAULT_SETTINGS };
      for (const row of rows) {
        if (row.key in settings) {
          settings[row.key as SettingKey] = row.value;
        }
      }

      return c.json(settings);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update settings";
      return c.json({ error: message }, 400);
    }
  }
);

export default app;
