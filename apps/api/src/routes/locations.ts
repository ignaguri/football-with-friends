import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { getServiceFactory } from "@repo/shared/services";
import { requireUser, type AppVariables } from "../middleware/security";
import { groupContextMiddleware, requireCurrentGroup } from "../middleware/group-context";
import { isSuperadmin, requireOrganizer } from "../middleware/authz";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", groupContextMiddleware);

const getLocationRepository = () => getRepositoryFactory().locations;

// Get all locations (scoped to current group)
app.get("/", async (c) => {
  const current = requireCurrentGroup(c);
  const locations = await getLocationRepository().findAll(current.id);
  return c.json(locations);
});

// Get single location by ID (404 on cross-group access)
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const current = requireCurrentGroup(c);
  const location = await getLocationRepository().findById(id);
  if (!location || location.groupId !== current.id) {
    return c.json({ error: "Location not found" }, 404);
  }
  return c.json(location);
});

// Create a new location (organizer only)
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
    const denied = requireOrganizer(c);
    if (denied) return denied;

    const current = requireCurrentGroup(c);
    const locationData = c.req.valid("json");

    try {
      const location = await getLocationRepository().create({
        ...locationData,
        groupId: current.id,
      });
      return c.json({ location }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create location";
      return c.json({ error: message }, 400);
    }
  }
);

// Update a location (organizer only)
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
    const denied = requireOrganizer(c);
    if (denied) return denied;

    const current = requireCurrentGroup(c);
    const locationId = c.req.param("id");
    const existing = await getLocationRepository().findById(locationId);
    if (!existing || existing.groupId !== current.id) {
      return c.json({ error: "Location not found" }, 404);
    }

    const updates = c.req.valid("json");

    try {
      const location = await getLocationRepository().update(locationId, updates);
      return c.json({ location });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update location";
      return c.json({ error: message }, 400);
    }
  }
);

app.post(
  "/copy-from/:sourceGroupId",
  async (c) => {
    const denied = requireOrganizer(c);
    if (denied) return denied;

    const user = requireUser(c);
    const current = requireCurrentGroup(c);
    const sourceGroupId = c.req.param("sourceGroupId");

    if (sourceGroupId === current.id) {
      return c.json(
        { error: "Source and target group must differ" },
        400,
      );
    }

    if (!isSuperadmin(c)) {
      const sourceMembership = await getRepositoryFactory().groupMembers.find(
        sourceGroupId,
        user.id,
      );
      if (!sourceMembership || sourceMembership.role !== "organizer") {
        return c.json(
          { error: "Must be an organizer of the source group" },
          403,
        );
      }
    } else {
      // Non-members (including superadmin) bypass the membership check above,
      // so verify the source group actually exists — otherwise a typo would
      // quietly return {0, 0} against an empty non-existent group.
      const sourceGroup = await getRepositoryFactory().groups.findById(
        sourceGroupId,
      );
      if (!sourceGroup) {
        return c.json({ error: "Source group not found" }, 404);
      }
    }

    try {
      const result = await getServiceFactory().groupService.copyVenues(
        sourceGroupId,
        current.id,
      );
      return c.json(result, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to copy venues";
      return c.json({ error: message }, 400);
    }
  },
);

// Delete a location (organizer only)
app.delete("/:id", async (c) => {
  const denied = requireOrganizer(c);
  if (denied) return denied;

  const current = requireCurrentGroup(c);
  const locationId = c.req.param("id");
  const existing = await getLocationRepository().findById(locationId);
  if (!existing || existing.groupId !== current.id) {
    return c.json({ error: "Location not found" }, 404);
  }

  try {
    await getLocationRepository().delete(locationId);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete location";
    return c.json({ error: message }, 400);
  }
});

export default app;
