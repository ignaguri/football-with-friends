import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getServiceFactory } from "@repo/shared/services";
import type { User } from "@repo/shared/domain";
import { auth } from "../auth";

const app = new Hono();

// Lazy service loading for Cloudflare Workers compatibility
const getMatchService = () => getServiceFactory().matchService;
const getPlayerStatsService = () => getServiceFactory().playerStatsService;

// Helper to convert session user to full User type
function sessionUserToUser(sessionUser: { id: string; name: string; email: string; role?: string }): User {
  return {
    ...sessionUser,
    role: (sessionUser.role as "user" | "admin") || "user",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Get all matches (with pagination)
app.get(
  "/",
  zValidator(
    "query",
    z.object({
      type: z.enum(["upcoming", "past", "all"]).optional(),
      limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 5),
      offset: z.string().optional().transform((val) => val ? parseInt(val, 10) : 0),
    })
  ),
  async (c) => {
    const { type, limit, offset } = c.req.valid("query");

    const status = type === "past"
      ? "completed"
      : type === "all"
        ? undefined
        : "upcoming";

    const result = await getMatchService().getAllMatches({
      status,
      limit,
      offset,
    });

    // Return paginated response
    return c.json({
      matches: result.matches,
      total: result.total,
      hasMore: offset + result.matches.length < result.total,
      page: Math.floor(offset / limit),
    });
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
    const match = await getMatchService().getMatchDetails(id, userId);
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

    const sessionUser = session.user as { id: string; name: string; email: string; role?: string };
  const user = sessionUserToUser(sessionUser);
    if (user.role !== "admin") {
      return c.json({ error: "Only administrators can create matches" }, 403);
    }

    const matchData = c.req.valid("json");

    try {
      const match = await getMatchService().createMatch(
        { ...matchData, createdByUserId: user.id },
        user
      );
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

    const sessionUser = session.user as { id: string; name: string; email: string; role?: string };
  const user = sessionUserToUser(sessionUser);
    if (user.role !== "admin") {
      return c.json({ error: "Only administrators can update matches" }, 403);
    }

    const matchId = c.req.param("id");
    const updates = c.req.valid("json");

    try {
      const match = await getMatchService().updateMatch(
        matchId,
        {
          ...updates,
          courtId: updates.courtId === null ? undefined : updates.courtId,
          costPerPlayer: updates.costPerPlayer === null ? undefined : updates.costPerPlayer,
          sameDayCost: updates.sameDayCost === null ? undefined : updates.sameDayCost,
        },
        user
      );
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

  const sessionUser = session.user as { id: string; name: string; email: string; role?: string };
  const user = sessionUserToUser(sessionUser);
  if (user.role !== "admin") {
    return c.json({ error: "Only administrators can delete matches" }, 403);
  }

  const matchId = c.req.param("id");

  try {
    await getMatchService().deleteMatch(matchId, user);
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
  const sessionUser = session.user as { id: string; name: string; email: string; role?: string };
  const user = sessionUserToUser(sessionUser);

  try {
    const signup = await getMatchService().signUpUser(matchId, user);
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
    const sessionUser = session.user as { id: string; name: string; email: string; role?: string };
  const user = sessionUserToUser(sessionUser);

    try {
      const signup = await getMatchService().addGuestPlayer(
        matchId,
        {
          ...guestData,
          matchId,
          ownerUserId: user.id,
          ownerName: user.name,
          ownerEmail: user.email,
        },
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
    const sessionUser = session.user as { id: string; name: string; email: string; role?: string };
  const user = sessionUserToUser(sessionUser);

    try {
      const signup = await getMatchService().addPlayerByAdmin(
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
    const sessionUser = session.user as { id: string; name: string; email: string; role?: string };
  const user = sessionUserToUser(sessionUser);

    try {
      const signup = await getMatchService().updateSignup(signupId, updates, user);
      return c.json({ signup });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update signup";
      return c.json({ error: message }, 400);
    }
  }
);

// Get all player stats for a match
app.get("/:id/player-stats", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const matchId = c.req.param("id");

  try {
    const stats = await getPlayerStatsService().getMatchStats(matchId);
    return c.json(stats);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get match stats";
    return c.json({ error: message }, 500);
  }
});

// Record player stats for a match (admin or self)
app.post(
  "/:id/player-stats",
  zValidator(
    "json",
    z.object({
      userId: z.string().min(1, "User ID is required"),
      goals: z.number().min(0).optional(),
      thirdTimeAttended: z.boolean().optional(),
      thirdTimeBeers: z.number().min(0).optional(),
    }),
  ),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const matchId = c.req.param("id");
    const data = c.req.valid("json");
    const sessionUser = session.user as {
      id: string;
      name: string;
      email: string;
      role?: string;
    };
    const user = sessionUserToUser(sessionUser);

    try {
      const stats = await getPlayerStatsService().recordStats(
        matchId,
        data.userId,
        data,
        user,
      );
      return c.json({ stats }, 201);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to record stats";
      return c.json({ error: message }, 400);
    }
  },
);

// Update player stats for a match (admin or self)
app.patch(
  "/:id/player-stats/:userId",
  zValidator(
    "json",
    z.object({
      goals: z.number().min(0).optional(),
      thirdTimeAttended: z.boolean().optional(),
      thirdTimeBeers: z.number().min(0).optional(),
      confirmed: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const matchId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const updates = c.req.valid("json");
    const sessionUser = session.user as {
      id: string;
      name: string;
      email: string;
      role?: string;
    };
    const user = sessionUserToUser(sessionUser);

    try {
      const stats = await getPlayerStatsService().updateStats(
        matchId,
        targetUserId,
        updates,
        user,
      );
      return c.json({ stats });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update stats";
      return c.json({ error: message }, 400);
    }
  },
);

export default app;
