import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { DEFAULT_SETTINGS, type AppSettings, type SettingKey } from "@repo/shared/domain";
import { type AppVariables } from "../middleware/security";
import { groupContextMiddleware, requireCurrentGroup } from "../middleware/group-context";
import { requireOrganizer } from "../middleware/authz";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", groupContextMiddleware);

// Settings are now per-group. The global `settings` table is still present
// post-migration (data is mirrored into `group_settings` under grp_legacy by
// the Phase 1 backfill), but reads/writes flow through the new table keyed
// by the active group.
const getGroupSettings = () => getRepositoryFactory().groupSettings;

// Get all settings for the current group, filling defaults for missing keys.
app.get("/", async (c) => {
  const current = requireCurrentGroup(c);
  try {
    const stored = await getGroupSettings().getAll(current.id);
    const settings: AppSettings = { ...DEFAULT_SETTINGS };
    for (const [key, value] of Object.entries(stored)) {
      if (key in settings) {
        settings[key as SettingKey] = value;
      }
    }
    return c.json(settings);
  } catch (error) {
    console.error("Error fetching group settings:", error);
    return c.json(DEFAULT_SETTINGS);
  }
});

// Update settings (organizer only)
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
    }),
  ),
  async (c) => {
    const denied = requireOrganizer(c);
    if (denied) return denied;

    const current = requireCurrentGroup(c);
    const updates = c.req.valid("json");

    try {
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          await getGroupSettings().set(current.id, key, value);
        }
      }

      const stored = await getGroupSettings().getAll(current.id);
      const settings: AppSettings = { ...DEFAULT_SETTINGS };
      for (const [key, value] of Object.entries(stored)) {
        if (key in settings) {
          settings[key as SettingKey] = value;
        }
      }
      return c.json(settings);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update settings";
      return c.json({ error: message }, 400);
    }
  },
);

export default app;
