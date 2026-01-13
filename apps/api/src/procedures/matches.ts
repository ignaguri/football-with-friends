import { getServiceFactory } from "@repo/shared/services";
import { z } from "zod";

import {
  adminProcedure,
  authedProcedure,
  baseProcedure,
} from "./base";

// Get service instances
const serviceFactory = getServiceFactory();
const matchService = serviceFactory.matchService;

// Match procedures
export const matchesProcedures = {
  // Get all matches
  getAll: baseProcedure
    .input(
      z.object({
        type: z.enum(["upcoming", "past", "all"]).optional(),
      })
    )
    .handler(async ({ input }) => {
      return matchService.getAllMatches({
        status:
          input.type === "past"
            ? "completed"
            : input.type === "all"
              ? undefined
              : "upcoming",
      });
    }),

  // Get single match by ID
  getById: baseProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      return matchService.getMatchDetails(input.id, input.userId);
    }),

  // Create match (admin only)
  create: adminProcedure
    .input(
      z.object({
        courtId: z.string(),
        date: z.string(),
        time: z.string(),
        maxPlayers: z.number().int().positive(),
        notes: z.string().optional(),
      })
    )
    .handler(async ({ input, context }) => {
      return matchService.createMatch({
        ...input,
        organizerId: context.user.id,
      });
    }),

  // Update match (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        courtId: z.string().optional(),
        date: z.string().optional(),
        time: z.string().optional(),
        maxPlayers: z.number().int().positive().optional(),
        notes: z.string().optional(),
        status: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
      })
    )
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      return matchService.updateMatch(id, data);
    }),

  // Delete match (admin only)
  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .handler(async ({ input }) => {
      await matchService.deleteMatch(input.id);
      return { success: true };
    }),

  // Signup operations
  signup: {
    // Create signup (authenticated users)
    create: authedProcedure
      .input(
        z.object({
          matchId: z.string(),
          guestName: z.string().optional(),
        })
      )
      .handler(async ({ input, context }) => {
        return matchService.createSignup({
          matchId: input.matchId,
          userId: context.user.id,
          guestName: input.guestName,
        });
      }),

    // Update signup status (admin only)
    updateStatus: adminProcedure
      .input(
        z.object({
          signupId: z.string(),
          status: z.enum(["pending", "confirmed", "cancelled"]),
        })
      )
      .handler(async ({ input }) => {
        return matchService.updateSignupStatus(input.signupId, input.status);
      }),

    // Remove signup
    remove: authedProcedure
      .input(
        z.object({
          signupId: z.string(),
        })
      )
      .handler(async ({ input, context }) => {
        await matchService.removeSignup(input.signupId, context.user.id);
        return { success: true };
      }),

    // Add player to match (admin only)
    addPlayer: adminProcedure
      .input(
        z.object({
          matchId: z.string(),
          userId: z.string().optional(),
          guestName: z.string().optional(),
        })
      )
      .handler(async ({ input }) => {
        return matchService.addPlayerToMatch(input.matchId, {
          userId: input.userId,
          guestName: input.guestName,
        });
      }),
  },
};
