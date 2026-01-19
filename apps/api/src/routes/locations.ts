import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { auth } from "../auth";

const app = new Hono();
const repositoryFactory = getRepositoryFactory();
const locationRepository = repositoryFactory.locations;

// Get all locations
app.get("/", async (c) => {
  const locations = await locationRepository.findAll();
  return c.json(locations);
});

// Get single location by ID
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const location = await locationRepository.findById(id);
  if (!location) {
    return c.json({ error: "Location not found" }, 404);
  }
  return c.json(location);
});

// Create a new location (admin only)
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Name is required"),
      address: z.string().optional(),
      coordinates: z.string().optional(),
    })
  ),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const user = session.user as { id: string; role?: string };
    if (user.role !== "admin") {
      return c.json({ error: "Only administrators can create locations" }, 403);
    }

    const locationData = c.req.valid("json");

    try {
      const location = await locationRepository.create(locationData);
      return c.json({ location }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create location";
      return c.json({ error: message }, 400);
    }
  }
);

// Update a location (admin only)
app.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).optional(),
      address: z.string().optional(),
      coordinates: z.string().optional(),
    })
  ),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const user = session.user as { id: string; role?: string };
    if (user.role !== "admin") {
      return c.json({ error: "Only administrators can update locations" }, 403);
    }

    const locationId = c.req.param("id");
    const updates = c.req.valid("json");

    try {
      const location = await locationRepository.update(locationId, updates);
      return c.json({ location });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update location";
      return c.json({ error: message }, 400);
    }
  }
);

// Delete a location (admin only)
app.delete("/:id", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = session.user as { id: string; role?: string };
  if (user.role !== "admin") {
    return c.json({ error: "Only administrators can delete locations" }, 403);
  }

  const locationId = c.req.param("id");

  try {
    await locationRepository.delete(locationId);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete location";
    return c.json({ error: message }, 400);
  }
});

export default app;
