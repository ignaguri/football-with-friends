import { zValidator } from "@hono/zod-validator";
import { getDatabase } from "@repo/shared/database";
import {
  type NotificationPreferences,
  NOTIFICATION_PREF_TO_COLUMN,
} from "@repo/shared/domain";
import { Hono } from "hono";
import { z } from "zod";

import { type AppVariables, requireUser } from "../middleware/security";

const app = new Hono<{ Variables: AppVariables }>();

const DEFAULT_PREFS: NotificationPreferences = {
  pushEnabled: true,
  pushNewMatch: true,
  pushMatchReminder: true,
  pushPromoToConfirmed: true,
};

function rowToResponse(row: {
  push_enabled: number;
  push_new_match: number;
  push_match_reminder: number;
  push_promo_to_confirmed: number;
}): NotificationPreferences {
  return {
    pushEnabled: Boolean(row.push_enabled),
    pushNewMatch: Boolean(row.push_new_match),
    pushMatchReminder: Boolean(row.push_match_reminder),
    pushPromoToConfirmed: Boolean(row.push_promo_to_confirmed),
  };
}

app.get("/", async (c) => {
  const user = requireUser(c);
  const row = await getDatabase()
    .selectFrom("user_notification_prefs")
    .selectAll()
    .where("user_id", "=", user.id)
    .executeTakeFirst();

  if (!row) return c.json(DEFAULT_PREFS);
  return c.json(rowToResponse(row));
});

const patchSchema = z
  .object({
    pushEnabled: z.boolean().optional(),
    pushNewMatch: z.boolean().optional(),
    pushMatchReminder: z.boolean().optional(),
    pushPromoToConfirmed: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "At least one preference must be provided",
  });

app.patch("/", zValidator("json", patchSchema), async (c) => {
  const user = requireUser(c);
  const updates = c.req.valid("json");
  const now = new Date().toISOString();

  // Build the column-level patch from the camelCase payload. Insert defaults
  // every column to "on"; update only the columns the user actually changed —
  // a single round trip and atomic per row.
  const columnUpdates: Record<string, number> = {};
  for (const [key, value] of Object.entries(updates) as [
    keyof NotificationPreferences,
    boolean | undefined,
  ][]) {
    if (value === undefined) continue;
    columnUpdates[NOTIFICATION_PREF_TO_COLUMN[key]] = value ? 1 : 0;
  }

  const db = getDatabase();
  await db
    .insertInto("user_notification_prefs")
    .values({
      user_id: user.id,
      push_enabled: 1,
      push_new_match: 1,
      push_match_reminder: 1,
      push_promo_to_confirmed: 1,
      updated_at: now,
      ...columnUpdates,
    })
    .onConflict((oc) =>
      oc.column("user_id").doUpdateSet({ ...columnUpdates, updated_at: now }),
    )
    .execute();

  const row = await db
    .selectFrom("user_notification_prefs")
    .selectAll()
    .where("user_id", "=", user.id)
    .executeTakeFirstOrThrow();

  return c.json(rowToResponse(row));
});

export default app;
