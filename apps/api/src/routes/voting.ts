import { Hono } from "hono";
import { votingService } from "@repo/shared/services";
import { auth } from "../auth";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const app = new Hono();

// Helper to get language from Accept-Language header
function getLanguage(acceptLanguage: string | null | undefined): "en" | "es" {
  if (!acceptLanguage) return "en";
  return acceptLanguage.toLowerCase().startsWith("es") ? "es" : "en";
}

// Helper to check admin role
async function requireAdmin(headers: Headers): Promise<{ user: any }> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if ((session.user as any).role !== "admin") {
    throw new Error("Admin access required");
  }
  return session;
}

// Helper to get authenticated user
async function requireAuth(headers: Headers): Promise<{ user: any }> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  return session;
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
    await requireAdmin(c.req.raw.headers);
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

app.post(
  "/criteria",
  zValidator("json", createCriteriaSchema),
  async (c) => {
    try {
      await requireAdmin(c.req.raw.headers);
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
  }
);

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

app.patch(
  "/criteria/:id",
  zValidator("json", updateCriteriaSchema),
  async (c) => {
    try {
      await requireAdmin(c.req.raw.headers);
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
  }
);

// Delete criteria (soft delete, admin only)
app.delete("/criteria/:id", async (c) => {
  try {
    await requireAdmin(c.req.raw.headers);
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
    const session = await requireAuth(c.req.raw.headers);
    const matchId = c.req.param("matchId");
    const votes = await votingService.getUserVotesForMatch(
      matchId,
      session.user.id
    );
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
    })
  ),
});

app.post(
  "/matches/:matchId",
  zValidator("json", submitVotesSchema),
  async (c) => {
    try {
      const session = await requireAuth(c.req.raw.headers);
      const matchId = c.req.param("matchId");
      const { votes } = c.req.valid("json");

      const submittedVotes = await votingService.submitVotes(
        matchId,
        session.user.id,
        votes
      );

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
  }
);

// Get voting results for a match
app.get("/matches/:matchId/results", async (c) => {
  try {
    await requireAuth(c.req.raw.headers);
    const matchId = c.req.param("matchId");
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
    const session = await requireAuth(c.req.raw.headers);
    const matchId = c.req.param("matchId");
    await votingService.clearUserVotesForMatch(matchId, session.user.id);
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
    const session = await requireAuth(c.req.raw.headers);
    const matchId = c.req.param("matchId");
    const hasVoted = await votingService.hasUserVotedForMatch(
      matchId,
      session.user.id
    );
    return c.json({ hasVoted });
  } catch (error: any) {
    console.error("Check has voted error:", error);
    if (error.message.includes("authenticated")) {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: error.message || "Failed to check vote status" }, 500);
  }
});

export default app;
