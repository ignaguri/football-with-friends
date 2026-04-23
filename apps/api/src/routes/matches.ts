import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getServiceFactory } from "@repo/shared/services";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { type AppVariables, sessionUserToUser, requireUser } from "../middleware/security";
import { INVITE_TARGET_PHONE_REGEX } from "./groups";
import { groupContextMiddleware, requireCurrentGroup } from "../middleware/group-context";
import { isCurrentOrganizer, requireOrganizer } from "../middleware/authz";
import {
  notifyMatchCreated,
  notifyMatchUpdated,
  notifyMatchCancelled,
  notifyPlayerConfirmed,
  notifySubstitutePromoted,
  notifyPlayerCancelled,
  notifyRemovedFromMatch,
} from "../lib/notify";

const app = new Hono<{ Variables: AppVariables }>();

// Lazy service loading for Cloudflare Workers compatibility
const getMatchService = () => getServiceFactory().matchService;
const getPlayerStatsService = () => getServiceFactory().playerStatsService;

// Public preview for OG metadata — registered BEFORE the group-context
// middleware so link previews work without auth. The preview payload is
// intentionally minimal (date/time/location-name) so there's nothing
// cross-group-sensitive to leak.
app.get("/:id/preview", async (c) => {
  const id = c.req.param("id");
  try {
    const match = await getMatchService().getMatchDetails(id);
    if (!match) {
      return c.json({ error: "Match not found" }, 404);
    }
    return c.json({
      date: match.date,
      time: match.time,
      maxPlayers: match.maxPlayers,
      location: match.location ? { name: match.location.name } : null,
    });
  } catch {
    return c.json({ error: "Failed to load match preview" }, 500);
  }
});

// Everything below requires an active group.
app.use("*", groupContextMiddleware);

// Get all matches (with pagination), scoped to current group.
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
    const userId = requireUser(c).id;
    const current = requireCurrentGroup(c);

    const status = type === "past"
      ? "completed"
      : type === "all"
        ? undefined
        : "upcoming";

    const result = await getMatchService().getAllMatches({
      groupId: current.id,
      status,
      sortDirection: type === "past" ? "desc" : "asc",
      limit,
      offset,
      userId, // Pass userId to get user's signup status
    });

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
  async (c) => {
    const id = c.req.param("id");
    const userId = requireUser(c).id;
    const current = requireCurrentGroup(c);
    const match = await getMatchService().getMatchDetails(id, userId);
    if (!match || match.groupId !== current.id) {
      return c.json({ error: "Match not found" }, 404);
    }
    return c.json(match);
  }
);

// Get players for a match (for voting)
app.get("/:matchId/players", async (c) => {
  const matchId = c.req.param("matchId");
  const current = requireCurrentGroup(c);
  const match = await getMatchService().getMatchDetails(matchId);

  if (!match || match.groupId !== current.id) {
    return c.json({ error: "Match not found" }, 404);
  }

  const players = match.signups
    .filter((signup) => signup.status === "PAID")
    .map((signup) => ({
      id: signup.id,
      signupId: signup.id,
      userId: signup.userId || signup.id,
      name: signup.playerName,
      username: signup.user?.username || null,
      displayUsername: signup.user?.displayUsername || null,
      guestName: signup.signupType === "guest" ? signup.playerName : null,
      isGuest: signup.signupType === "guest",
      isCancelled: signup.status === "CANCELLED",
    }));

  return c.json({ players });
});

// Create a new match (organizer only)
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
    const denied = requireOrganizer(c);
    if (denied) return denied;

    const sessionUser = requireUser(c);
    const user = sessionUserToUser(sessionUser);
    const current = requireCurrentGroup(c);
    const matchData = c.req.valid("json");

    try {
      const match = await getMatchService().createMatch(
        current.id,
        matchData,
        user,
      );

      c.executionCtx?.waitUntil(notifyMatchCreated(match, user.id));

      return c.json({ match }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create match";
      return c.json({ error: message }, 400);
    }
  }
);

// Update a match (organizer only)
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
    const denied = requireOrganizer(c);
    if (denied) return denied;

    const current = requireCurrentGroup(c);
    const matchId = c.req.param("id");
    const updates = c.req.valid("json");

    try {
      const match = await getMatchService().updateMatch(
        current.id,
        matchId,
        {
          ...updates,
          courtId: updates.courtId === null ? undefined : updates.courtId,
          costPerPlayer: updates.costPerPlayer === null ? undefined : updates.costPerPlayer,
          sameDayCost: updates.sameDayCost === null ? undefined : updates.sameDayCost,
        },
      );

      if (updates.status === "cancelled") {
        c.executionCtx?.waitUntil(notifyMatchCancelled(match));
      } else if (updates.date || updates.time || updates.locationId) {
        const parts: string[] = [];
        if (updates.date) parts.push("date");
        if (updates.time) parts.push("time");
        if (updates.locationId) parts.push("location");
        c.executionCtx?.waitUntil(notifyMatchUpdated(match, parts.join(", ") + " changed"));
      }

      return c.json({ match });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update match";
      return c.json({ error: message }, 400);
    }
  }
);

// Delete a match (organizer only)
app.delete("/:id", async (c) => {
  const denied = requireOrganizer(c);
  if (denied) return denied;

  const current = requireCurrentGroup(c);
  const matchId = c.req.param("id");

  try {
    await getMatchService().deleteMatch(current.id, matchId);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete match";
    return c.json({ error: message }, 400);
  }
});

// Sign up for a match
app.post("/:id/signup", async (c) => {
  const matchId = c.req.param("id");
  const sessionUser = requireUser(c);
  const user = sessionUserToUser(sessionUser);
  const current = requireCurrentGroup(c);

  try {
    const signup = await getMatchService().signUpUser(current.id, matchId, user);
    return c.json({ signup }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sign up";
    return c.json({ error: message }, 400);
  }
});

// Add a guest to a match. Accepts either `{rosterId}` (existing ghost) or
// `{guestName, phone?, email?}` (inline create). The service backs every
// guest signup with a roster entry.
app.post(
  "/:id/guest",
  zValidator(
    "json",
    z.union([
      z.object({
        rosterId: z.string().min(1),
        status: z.enum(["PENDING", "PAID", "SUBSTITUTE"]).default("PENDING"),
      }),
      z.object({
        guestName: z.string().trim().min(1, "Guest name is required"),
        phone: z
          .string()
          .trim()
          .regex(INVITE_TARGET_PHONE_REGEX, "phone must be E.164 (e.g. +1234567890)")
          .optional(),
        email: z.string().trim().email().optional(),
        status: z.enum(["PENDING", "PAID", "SUBSTITUTE"]).default("PENDING"),
      }),
    ])
  ),
  async (c) => {
    const matchId = c.req.param("id");
    const body = c.req.valid("json");
    const sessionUser = requireUser(c);
    const user = sessionUserToUser(sessionUser);
    const current = requireCurrentGroup(c);

    try {
      const signup = await getMatchService().addGuestPlayer(
        current.id,
        matchId,
        body,
        user,
      );
      return c.json({ signup }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add guest";
      return c.json({ error: message }, 400);
    }
  }
);

// Organizer: Add a player to a match
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
    const denied = requireOrganizer(c);
    if (denied) return denied;

    const matchId = c.req.param("id");
    const playerData = c.req.valid("json");
    const sessionUser = requireUser(c);
    const user = sessionUserToUser(sessionUser);
    const current = requireCurrentGroup(c);

    try {
      const signup = await getMatchService().addPlayerAsOrganizer(
        current.id,
        matchId,
        playerData,
        user,
      );
      return c.json({ signup }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add player";
      return c.json({ error: message }, 400);
    }
  }
);

// Update a signup (status change). Organizers can update anyone's signup;
// non-organizers can update their own or one they added.
app.patch(
  "/:id/signup/:signupId",
  zValidator(
    "json",
    z.object({
      status: z.enum(["PENDING", "PAID", "CANCELLED", "SUBSTITUTE"]).optional(),
      playerName: z.string().min(1).optional(),
    })
  ),
  async (c) => {
    const signupId = c.req.param("signupId");
    const updates = c.req.valid("json");
    const sessionUser = requireUser(c);
    const user = sessionUserToUser(sessionUser);
    const current = requireCurrentGroup(c);
    const isOrganizer = isCurrentOrganizer(c);

    try {
      const matchId = c.req.param("id");
      const result = await getMatchService().updateSignup(
        current.id,
        signupId,
        updates,
        user,
        isOrganizer,
      );

      const match = await getRepositoryFactory().matches.findById(matchId);
      if (match && match.groupId === current.id) {
        if (updates.status === "PAID" && result.oldStatus !== "PAID" && result.signup.userId) {
          c.executionCtx?.waitUntil(notifyPlayerConfirmed(match, result.signup.userId));
        }
        if (result.oldStatus === "PAID" && updates.status === "CANCELLED") {
          c.executionCtx?.waitUntil(notifyPlayerCancelled(match, result.signup.playerName));
        }
        if (result.promotedSubstitute?.userId) {
          c.executionCtx?.waitUntil(notifySubstitutePromoted(match, result.promotedSubstitute.userId));
        }
      }

      return c.json({ signup: result.signup });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update signup";
      return c.json({ error: message }, 400);
    }
  }
);

// Organizer: Remove a player from a match (hard delete)
app.delete("/:id/signup/:signupId", async (c) => {
  const denied = requireOrganizer(c);
  if (denied) return denied;

  const matchId = c.req.param("id");
  const signupId = c.req.param("signupId");
  const sessionUser = requireUser(c);
  const user = sessionUserToUser(sessionUser);
  const current = requireCurrentGroup(c);

  try {
    const [signup, match] = await Promise.all([
      getRepositoryFactory().signups.findById(signupId),
      getRepositoryFactory().matches.findById(matchId),
    ]);

    await getMatchService().removePlayerAsOrganizer(current.id, signupId, user);

    if (signup?.userId && match && match.groupId === current.id) {
      c.executionCtx?.waitUntil(notifyRemovedFromMatch(match, signup.userId));
    }

    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove player";
    return c.json({ error: message }, 400);
  }
});

// Get all player stats for a match
app.get("/:id/player-stats", async (c) => {
  const matchId = c.req.param("id");
  const current = requireCurrentGroup(c);

  try {
    const match = await getRepositoryFactory().matches.findById(matchId);
    if (!match || match.groupId !== current.id) {
      return c.json({ error: "Match not found" }, 404);
    }
    const stats = await getPlayerStatsService().getMatchStats(matchId);
    return c.json(stats);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get match stats";
    return c.json({ error: message }, 500);
  }
});

// Record player stats for a match (organizer or self)
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
    const matchId = c.req.param("id");
    const data = c.req.valid("json");
    const sessionUser = requireUser(c);
    const user = sessionUserToUser(sessionUser);
    const current = requireCurrentGroup(c);
    const isOrganizer = isCurrentOrganizer(c);

    try {
      const stats = await getPlayerStatsService().recordStats(
        current.id,
        matchId,
        data.userId,
        data,
        user,
        isOrganizer,
      );
      return c.json({ stats }, 201);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to record stats";
      return c.json({ error: message }, 400);
    }
  },
);

// Update player stats for a match (organizer or self)
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
    const matchId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const updates = c.req.valid("json");
    const sessionUser = requireUser(c);
    const user = sessionUserToUser(sessionUser);
    const current = requireCurrentGroup(c);
    const isOrganizer = isCurrentOrganizer(c);

    try {
      const stats = await getPlayerStatsService().updateStats(
        current.id,
        matchId,
        targetUserId,
        updates,
        user,
        isOrganizer,
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
