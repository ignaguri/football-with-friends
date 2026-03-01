import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getServiceFactory } from "@repo/shared/services";
import { auth } from "../auth";

const app = new Hono();

// Lazy service loading for Cloudflare Workers compatibility
const getCourtService = () => getServiceFactory().courtService;

// Get all courts
app.get(
  "/",
  zValidator(
    "query",
    z.object({
      locationId: z.string().optional(),
    })
  ),
  async (c) => {
    const { locationId } = c.req.valid("query");
    const courts = locationId
      ? await getCourtService().getCourtsByLocationId(locationId)
      : await getCourtService().getAllCourts();
    return c.json(courts);
  }
);

// Get single court by ID
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const court = await getCourtService().getCourtById(id);
  if (!court) {
    return c.json({ error: "Court not found" }, 404);
  }
  return c.json(court);
});

// Create a new court (admin only)
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Name is required"),
      locationId: z.string().min(1, "Location is required"),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
    })
  ),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const user = session.user as { id: string; role?: string };
    if (user.role !== "admin") {
      return c.json({ error: "Only administrators can create courts" }, 403);
    }

    const courtData = c.req.valid("json");

    try {
      const court = await getCourtService().createCourt(courtData);
      return c.json({ court }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create court";
      return c.json({ error: message }, 400);
    }
  }
);

// Update a court (admin only)
app.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    })
  ),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const user = session.user as { id: string; role?: string };
    if (user.role !== "admin") {
      return c.json({ error: "Only administrators can update courts" }, 403);
    }

    const courtId = c.req.param("id");
    const updates = c.req.valid("json");

    try {
      const court = await getCourtService().updateCourt(courtId, updates);
      return c.json({ court });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update court";
      return c.json({ error: message }, 400);
    }
  }
);

// Delete a court (admin only)
app.delete("/:id", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = session.user as { id: string; role?: string };
  if (user.role !== "admin") {
    return c.json({ error: "Only administrators can delete courts" }, 403);
  }

  const courtId = c.req.param("id");

  try {
    await getCourtService().deleteCourt(courtId);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete court";
    return c.json({ error: message }, 400);
  }
});

export default app;
