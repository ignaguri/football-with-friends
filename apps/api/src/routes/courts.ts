import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getServiceFactory } from "@repo/shared/services";

const app = new Hono();
const serviceFactory = getServiceFactory();
const courtService = serviceFactory.courtService;

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
    const courts = await courtService.getAllCourts(locationId);
    return c.json(courts);
  }
);

// Get single court by ID
app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const court = await courtService.getCourtById(id);
  if (!court) {
    return c.json({ error: "Court not found" }, 404);
  }
  return c.json(court);
});

export default app;
