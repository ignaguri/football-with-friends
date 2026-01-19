import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getServiceFactory } from "@repo/shared/services";
import { auth } from "../auth";

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

// Create a new match (admin only)
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
      time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
      locationId: z.string().min(1, "Location is required"),
      courtId: z.string().optional(),
      maxPlayers: z.number().min(2).default(10),
      maxSubstitutes: z.number().min(0).default(2),
      costPerPlayer: z.string().optional(),
      sameDayCost: z.string().optional(),
    })
  ),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const user = session.user as { id: string; name: string; email: string; role?: string };
    if (user.role !== "admin") {
      return c.json({ error: "Only administrators can create matches" }, 403);
    }

    const matchData = c.req.valid("json");

    try {
      const match = await matchService.createMatch(matchData, user);
      return c.json({ match }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create match";
      return c.json({ error: message }, 400);
    }
  }
);

// Update a match (admin only)
app.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      locationId: z.string().optional(),
      courtId: z.string().nullable().optional(),
      maxPlayers: z.number().min(2).optional(),
      maxSubstitutes: z.number().min(0).optional(),
      costPerPlayer: z.string().nullable().optional(),
      sameDayCost: z.string().nullable().optional(),
      status: z.enum(["upcoming", "completed", "cancelled"]).optional(),
    })
  ),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const user = session.user as { id: string; name: string; email: string; role?: string };
    if (user.role !== "admin") {
      return c.json({ error: "Only administrators can update matches" }, 403);
    }

    const matchId = c.req.param("id");
    const updates = c.req.valid("json");

    try {
      const match = await matchService.updateMatch(matchId, updates, user);
      return c.json({ match });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update match";
      return c.json({ error: message }, 400);
    }
  }
);

// Delete a match (admin only)
app.delete("/:id", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = session.user as { id: string; name: string; email: string; role?: string };
  if (user.role !== "admin") {
    return c.json({ error: "Only administrators can delete matches" }, 403);
  }

  const matchId = c.req.param("id");

  try {
    await matchService.deleteMatch(matchId, user);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete match";
    return c.json({ error: message }, 400);
  }
});

// Sign up for a match
app.post("/:id/signup", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const matchId = c.req.param("id");
  const user = session.user as { id: string; name: string; email: string; role?: string };

  try {
    const signup = await matchService.signUpUser(matchId, user);
    return c.json({ signup }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sign up";
    return c.json({ error: message }, 400);
  }
});

// Add a guest to a match
app.post(
  "/:id/guest",
  zValidator(
    "json",
    z.object({
      matchId: z.string(),
      guestName: z.string().min(1, "Guest name is required"),
      guestEmail: z.string().email().optional(),
      status: z.enum(["PENDING", "PAID", "SUBSTITUTE"]).default("PENDING"),
    })
  ),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const matchId = c.req.param("id");
    const guestData = c.req.valid("json");
    const user = session.user as { id: string; name: string; email: string; role?: string };

    try {
      const signup = await matchService.addGuestPlayer(
        matchId,
        { ...guestData, matchId },
        user
      );
      return c.json({ signup }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add guest";
      return c.json({ error: message }, 400);
    }
  }
);

// Admin: Add a player to a match
app.post(
  "/:id/admin-add-player",
  zValidator(
    "json",
    z.object({
      userId: z.string().optional(),
      playerName: z.string().min(1, "Player name is required"),
      playerEmail: z.string().email("Valid email is required"),
      status: z.enum(["PENDING", "PAID", "SUBSTITUTE"]).default("PENDING"),
    })
  ),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const matchId = c.req.param("id");
    const playerData = c.req.valid("json");
    const user = session.user as { id: string; name: string; email: string; role?: string };

    try {
      const signup = await matchService.addPlayerByAdmin(
        matchId,
        playerData,
        user
      );
      return c.json({ signup }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add player";
      return c.json({ error: message }, 400);
    }
  }
);

// Update a signup (status change)
app.patch(
  "/:id/signup/:signupId",
  zValidator(
    "json",
    z.object({
      status: z.enum(["PENDING", "PAID", "CANCELLED", "SUBSTITUTE"]).optional(),
    })
  ),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const signupId = c.req.param("signupId");
    const updates = c.req.valid("json");
    const user = session.user as { id: string; name: string; email: string; role?: string };

    try {
      const signup = await matchService.updateSignup(signupId, updates, user);
      return c.json({ signup });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update signup";
      return c.json({ error: message }, 400);
    }
  }
);

export default app;
