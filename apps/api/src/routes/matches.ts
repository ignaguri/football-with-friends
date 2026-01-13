import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getServiceFactory } from "@repo/shared/services";

const app = new Hono();
const serviceFactory = getServiceFactory();
const matchService = serviceFactory.matchService;

// Get all matches
app.get(
  "/",
  zValidator(
    "query",
    z.object({
      type: z.enum(["upcoming", "past", "all"]).optional(),
    })
  ),
  async (c) => {
    const { type } = c.req.valid("query");
    const matches = await matchService.getAllMatches({
      status:
        type === "past"
          ? "completed"
          : type === "all"
            ? undefined
            : "upcoming",
    });
    return c.json(matches);
  }
);

// Get single match by ID
app.get(
  "/:id",
  zValidator(
    "query",
    z.object({
      userId: z.string().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const { userId } = c.req.valid("query");
    const match = await matchService.getMatchDetails(id, userId);
    if (!match) {
      return c.json({ error: "Match not found" }, 404);
    }
    return c.json(match);
  }
);

export default app;
