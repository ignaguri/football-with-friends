import { zValidator } from "@hono/zod-validator";
import { getRepositoryFactory } from "@repo/shared/repositories";
import { votingService, getServiceFactory } from "@repo/shared/services";
import { Hono } from "hono";
import { z } from "zod";

import type { Match } from "@repo/shared/domain";
import type { Context } from "hono";

import { assertInCurrentGroup, requireOrganizer, requirePlatformAdmin } from "../middleware/authz";
import { groupContextMiddleware, requireCurrentGroup } from "../middleware/group-context";
import { type AppVariables, requireUser } from "../middleware/security";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", groupContextMiddleware);

function getLanguage(acceptLanguage: string | null | undefined): "en" | "es" {
  if (!acceptLanguage) return "en";
  return acceptLanguage.toLowerCase().startsWith("es") ? "es" : "en";
}

// Voting criteria are global (shared across groups) by design. Per-group
// leaderboards and match-specific endpoints are scoped via `currentGroup.id`
// (filtered by `match_votes.group_id`) and `assertMatchInCurrentGroup`
// respectively — cross-group matchIds 404, other groups' votes never surface.
async function assertMatchInCurrentGroup(c: Context, matchId: string): Promise<Response | null> {
  const match = await getRepositoryFactory().matches.findById(matchId);
  return assertInCurrentGroup(c, match, "Match not found");
}

// Same group-scoping check as `assertMatchInCurrentGroup`, but returns the
// loaded match on success so the handler can avoid a second `findById`.
async function loadMatchInCurrentGroup(
  c: Context,
  matchId: string,
): Promise<{ match: Match } | { response: Response }> {
  const match = await getRepositoryFactory().matches.findById(matchId);
  const denied = assertInCurrentGroup(c, match, "Match not found");
  if (denied || !match) return { response: denied! };
  return { match };
}

// ==================== VOTING CRITERIA ====================

// Get active voting criteria (for users)
app.get("/criteria", async (c) => {
  try {
    const language = getLanguage(c.req.header("Accept-Language"));
    const criteria = await votingService.getActiveCriteria(language);
    return c.json({ criteria });
  } catch (error: any) {
    console.error("Get criteria error:", error);
    return c.json({ error: error.message || "Failed to get criteria" }, 500);
  }
});

// Get all voting criteria including inactive (admin only) - returns full data for editing
app.get("/criteria/all", async (c) => {
  try {
    const denied = requirePlatformAdmin(c);
    if (denied) return denied;
    const criteria = await votingService.getAllCriteriaFull();
    return c.json({ criteria });
  } catch (error: any) {
    console.error("Get all criteria error:", error);
    if (error.message.includes("Admin")) {
      return c.json({ error: error.message }, 403);
    }
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || "Failed to get criteria" }, 500);
  }
});

// Create new criteria (admin only)
const createCriteriaSchema = z.object({
  code: z.string().min(1).max(50),
  nameEn: z.string().min(1).max(100),
  nameEs: z.string().min(1).max(100),
  descriptionEn: z.string().max(500).optional(),
  descriptionEs: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
});

app.post("/criteria", zValidator("json", createCriteriaSchema), async (c) => {
  try {
    const denied = requirePlatformAdmin(c);
    if (denied) return denied;
    const data = c.req.valid("json");
    const criteria = await votingService.createCriteria(data);
    return c.json({ criteria }, 201);
  } catch (error: any) {
    console.error("Create criteria error:", error);
    if (error.message.includes("Admin")) {
      return c.json({ error: error.message }, 403);
    }
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    if (error.message.includes("already exists")) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: error.message || "Failed to create criteria" }, 500);
  }
});

// Update criteria (admin only)
const updateCriteriaSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  nameEn: z.string().min(1).max(100).optional(),
  nameEs: z.string().min(1).max(100).optional(),
  descriptionEn: z.string().max(500).optional(),
  descriptionEs: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

app.patch("/criteria/:id", zValidator("json", updateCriteriaSchema), async (c) => {
  try {
    const denied = requirePlatformAdmin(c);
    if (denied) return denied;
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const criteria = await votingService.updateCriteria(id, data);
    return c.json({ criteria });
  } catch (error: any) {
    console.error("Update criteria error:", error);
    if (error.message.includes("Admin")) {
      return c.json({ error: error.message }, 403);
    }
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    if (error.message.includes("not found")) {
      return c.json({ error: error.message }, 404);
    }
    if (error.message.includes("already exists")) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: error.message || "Failed to update criteria" }, 500);
  }
});

// Delete criteria (soft delete, admin only)
app.delete("/criteria/:id", async (c) => {
  try {
    const denied = requirePlatformAdmin(c);
    if (denied) return denied;
    const id = c.req.param("id");
    await votingService.deleteCriteria(id);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Delete criteria error:", error);
    if (error.message.includes("Admin")) {
      return c.json({ error: error.message }, 403);
    }
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    if (error.message.includes("not found")) {
      return c.json({ error: error.message }, 404);
    }
    return c.json({ error: error.message || "Failed to delete criteria" }, 500);
  }
});

// ==================== MATCH VOTES ====================

// Get user's votes for a match
app.get("/matches/:matchId", async (c) => {
  try {
    const user = requireUser(c);
    const matchId = c.req.param("matchId");
    const notFound = await assertMatchInCurrentGroup(c, matchId);
    if (notFound) return notFound;
    const votes = await votingService.getUserVotesForMatch(matchId, user.id);
    return c.json(votes);
  } catch (error: any) {
    console.error("Get user votes error:", error);
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || "Failed to get votes" }, 500);
  }
});

// Submit votes for a match
const submitVotesSchema = z.object({
  votes: z.array(
    z.object({
      criteriaId: z.string().min(1),
      votedForUserId: z.string().min(1),
    }),
  ),
});

app.post("/matches/:matchId", zValidator("json", submitVotesSchema), async (c) => {
  try {
    const user = requireUser(c);
    const matchId = c.req.param("matchId");
    const notFound = await assertMatchInCurrentGroup(c, matchId);
    if (notFound) return notFound;
    const { votes } = c.req.valid("json");

    const submittedVotes = await votingService.submitVotes(matchId, user.id, votes);

    return c.json({ votes: submittedVotes }, 201);
  } catch (error: any) {
    console.error("Submit votes error:", error);
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    if (
      error.message.includes("Invalid") ||
      error.message.includes("inactive") ||
      error.message.includes("only be voted")
    ) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: error.message || "Failed to submit votes" }, 500);
  }
});

app.get("/matches/:matchId/stats", async (c) => {
  try {
    requireUser(c);
    const matchId = c.req.param("matchId");
    const result = await loadMatchInCurrentGroup(c, matchId);
    if ("response" in result) return result.response;
    const language = getLanguage(c.req.header("Accept-Language"));
    const stats = await votingService.getMatchStats(result.match, language);
    return c.json(stats);
  } catch (error: any) {
    console.error("Get match stats error:", error);
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    if (error.message.includes("not found")) {
      return c.json({ error: error.message }, 404);
    }
    return c.json({ error: error.message || "Failed to get stats" }, 500);
  }
});

app.post("/matches/:matchId/close-voting", async (c) => {
  try {
    requireUser(c);
    const matchId = c.req.param("matchId");
    const notFound = await assertMatchInCurrentGroup(c, matchId);
    if (notFound) return notFound;
    const denied = requireOrganizer(c);
    if (denied) return denied;
    await votingService.setMatchVotingState(matchId, true);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Close voting error:", error);
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || "Failed to close voting" }, 500);
  }
});

app.post("/matches/:matchId/reopen-voting", async (c) => {
  try {
    requireUser(c);
    const matchId = c.req.param("matchId");
    const notFound = await assertMatchInCurrentGroup(c, matchId);
    if (notFound) return notFound;
    const denied = requireOrganizer(c);
    if (denied) return denied;
    await votingService.setMatchVotingState(matchId, false);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Reopen voting error:", error);
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || "Failed to reopen voting" }, 500);
  }
});

// Get voting results for a match
app.get("/matches/:matchId/results", async (c) => {
  try {
    requireUser(c);
    const matchId = c.req.param("matchId");
    const notFound = await assertMatchInCurrentGroup(c, matchId);
    if (notFound) return notFound;
    const language = getLanguage(c.req.header("Accept-Language"));
    const results = await votingService.getMatchVotingResults(matchId, language);
    return c.json(results);
  } catch (error: any) {
    console.error("Get voting results error:", error);
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || "Failed to get results" }, 500);
  }
});

// Clear user's votes for a match (allows re-voting)
app.delete("/matches/:matchId", async (c) => {
  try {
    const user = requireUser(c);
    const matchId = c.req.param("matchId");
    const notFound = await assertMatchInCurrentGroup(c, matchId);
    if (notFound) return notFound;
    await votingService.clearUserVotesForMatch(matchId, user.id);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Clear votes error:", error);
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || "Failed to clear votes" }, 500);
  }
});

// Check if user has voted for a match
app.get("/matches/:matchId/has-voted", async (c) => {
  try {
    const user = requireUser(c);
    const matchId = c.req.param("matchId");
    const notFound = await assertMatchInCurrentGroup(c, matchId);
    if (notFound) return notFound;
    const hasVoted = await votingService.hasUserVotedForMatch(matchId, user.id);
    return c.json({ hasVoted });
  } catch (error: any) {
    console.error("Check has voted error:", error);
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || "Failed to check vote status" }, 500);
  }
});

// Get voting leaderboard (top N players per criteria) for the active group.
app.get("/leaderboard", async (c) => {
  try {
    requireUser(c);
    const current = requireCurrentGroup(c);
    const { topN = "3" } = c.req.query();
    const language = getLanguage(c.req.header("Accept-Language"));
    const rankingService = getServiceFactory().rankingService;
    const leaderboard = await rankingService.getVotingLeaderboard(
      current.id,
      language,
      parseInt(topN, 10),
    );
    return c.json(leaderboard);
  } catch (error: any) {
    console.error("Get leaderboard error:", error);
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || "Failed to get leaderboard" }, 500);
  }
});

export default app;
