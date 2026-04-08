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
        locationId: z.string(),
        courtId: z.string().optional(),
        date: z.string(),
        time: z.string(),
        maxPlayers: z.number().int().positive().optional(),
        maxSubstitutes: z.number().int().min(0).optional(),
        costPerPlayer: z.string().optional(),
        sameDayCost: z.string().optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const user = {
        ...context.user,
        role: context.user.role as "user" | "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return matchService.createMatch({
        ...input,
        createdByUserId: context.user.id,
      }, user);
    }),

  // Update match (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        locationId: z.string().optional(),
        courtId: z.string().optional(),
        date: z.string().optional(),
        time: z.string().optional(),
        maxPlayers: z.number().int().positive().optional(),
        maxSubstitutes: z.number().int().min(0).optional(),
        costPerPlayer: z.string().optional(),
        sameDayCost: z.string().optional(),
        status: z.enum(["upcoming", "cancelled", "completed"]).optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const { id, ...data } = input;
      const user = {
        ...context.user,
        role: context.user.role as "user" | "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return matchService.updateMatch(id, data, user);
    }),

  // Delete match (admin only)
  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .handler(async ({ input, context }) => {
      const user = {
        ...context.user,
        role: context.user.role as "user" | "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await matchService.deleteMatch(input.id, user);
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
        const user = {
          ...context.user,
          role: context.user.role as "user" | "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return matchService.signUpUser(
          input.matchId,
          user,
          input.guestName ? { playerName: input.guestName } : undefined
        );
      }),

    // Update signup status (admin only)
    updateStatus: adminProcedure
      .input(
        z.object({
          signupId: z.string(),
          status: z.enum(["pending", "confirmed", "cancelled"]),
        })
      )
      .handler(async ({ input, context }) => {
        const user = {
          ...context.user,
          role: context.user.role as "user" | "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const result = await matchService.updateSignup(input.signupId, { status: input.status }, user);
        return result.signup;
      }),

    // Remove signup
    remove: authedProcedure
      .input(
        z.object({
          signupId: z.string(),
        })
      )
      .handler(async ({ input, context }) => {
        const user = {
          ...context.user,
          role: context.user.role as "user" | "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await matchService.removePlayerByAdmin(input.signupId, user);
        return { success: true };
      }),

    // Add player to match (admin only)
    addPlayer: adminProcedure
      .input(
        z.object({
          matchId: z.string(),
          userId: z.string().optional(),
          playerName: z.string().min(1),
          playerEmail: z.string().email(),
          status: z.enum(["PENDING", "PAID", "SUBSTITUTE"]).optional(),
        })
      )
      .handler(async ({ input, context }) => {
        const user = {
          ...context.user,
          role: context.user.role as "user" | "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return matchService.addPlayerByAdmin(
          input.matchId,
          {
            userId: input.userId,
            playerName: input.playerName,
            playerEmail: input.playerEmail,
            status: input.status,
          },
          user
        );
      }),
  },
};
