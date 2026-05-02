import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getServiceFactory } from "@repo/shared/services";
import { type AppVariables } from "../middleware/security";
import { groupContextMiddleware, requireCurrentGroup } from "../middleware/group-context";
import { requireOrganizer } from "../middleware/authz";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", groupContextMiddleware);

const getCourtService = () => getServiceFactory().courtService;

// Get all courts (scoped to current group), optionally filtered by location.
app.get(
  "/",
  zValidator(
    "query",
    z.object({
      locationId: z.string().optional(),
    }),
  ),
  async (c) => {
    const { locationId } = c.req.valid("query");
    const current = requireCurrentGroup(c);
    const courts = locationId
      ? await getCourtService().getCourtsByLocationId(current.id, locationId)
      : await getCourtService().getAllCourts(current.id);
    return c.json(courts);
  },
);

// Get single court by ID (404 on cross-group).
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const current = requireCurrentGroup(c);
  const court = await getCourtService().getCourtById(id);
  if (!court || court.groupId !== current.id) {
    return c.json({ error: "Court not found" }, 404);
  }
  return c.json(court);
});

// Create a new court (organizer only)
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Name is required"),
      locationId: z.string().min(1, "Location is required"),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
    }),
  ),
  async (c) => {
    const denied = requireOrganizer(c);
    if (denied) return denied;

    const current = requireCurrentGroup(c);
    const courtData = c.req.valid("json");

    try {
      const court = await getCourtService().createCourt({
        ...courtData,
        groupId: current.id,
      });
      return c.json({ court }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create court";
      return c.json({ error: message }, 400);
    }
  },
);

// Update a court (organizer only)
app.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const denied = requireOrganizer(c);
    if (denied) return denied;

    const current = requireCurrentGroup(c);
    const courtId = c.req.param("id");
    const existing = await getCourtService().getCourtById(courtId);
    if (!existing || existing.groupId !== current.id) {
      return c.json({ error: "Court not found" }, 404);
    }

    const updates = c.req.valid("json");
    try {
      const court = await getCourtService().updateCourt(courtId, updates);
      return c.json({ court });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update court";
      return c.json({ error: message }, 400);
    }
  },
);

// Delete a court (organizer only)
app.delete("/:id", async (c) => {
  const denied = requireOrganizer(c);
  if (denied) return denied;

  const current = requireCurrentGroup(c);
  const courtId = c.req.param("id");
  const existing = await getCourtService().getCourtById(courtId);
  if (!existing || existing.groupId !== current.id) {
    return c.json({ error: "Court not found" }, 404);
  }

  try {
    await getCourtService().deleteCourt(courtId);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete court";
    return c.json({ error: message }, 400);
  }
});

export default app;
