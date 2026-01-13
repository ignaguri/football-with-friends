import { Hono } from "hono";
import { getRepositoryFactory } from "@repo/shared/repositories";

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

export default app;
