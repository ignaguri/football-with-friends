import { getServiceFactory } from "@repo/shared/services";
import { createProcedure } from "orpc/server";
import { z } from "zod";

import { withAuth, withAdminAuth } from "../middleware/auth";

// Get service instances
const serviceFactory = getServiceFactory();
const matchService = serviceFactory.matches;

// Base procedure
const baseProcedure = createProcedure();

// Match procedures
export const matchesProcedures = {
  // Get all matches
  getAll: baseProcedure
    .input(
      z.object({
        type: z.enum(["upcoming", "past", "all"]).optional(),
      }),
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
      }),
    )
    .handler(async ({ input }) => {
      return matchService.getMatchDetails(input.id, input.userId);
    }),

  // Create match (admin only)
  create: baseProcedure
    .use(withAdminAuth)
    .input(
      z.object({
        locationId: z.string(),
        courtId: z.string().optional(),
        date: z.string(), // YYYY-MM-DD
        time: z.string(), // HH:MM
        maxPlayers: z.number().min(2).max(50),
        costPerPlayer: z.number().min(0).optional(),
        shirtCost: z.number().min(0).optional(),
        status: z.enum(["upcoming", "cancelled", "completed"]).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      return matchService.createMatch(
        {
          locationId: input.locationId,
          courtId: input.courtId,
          date: input.date,
          time: input.time,
          maxPlayers: input.maxPlayers,
          costPerPlayer: input.costPerPlayer,
          shirtCost: input.shirtCost,
          status: input.status,
        },
        context.user.id,
      );
    }),

  // Update match (admin only)
  update: baseProcedure
    .use(withAdminAuth)
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          locationId: z.string().optional(),
          courtId: z.string().optional(),
          date: z.string().optional(),
          time: z.string().optional(),
          maxPlayers: z.number().min(2).max(50).optional(),
          costPerPlayer: z.number().min(0).optional(),
          shirtCost: z.number().min(0).optional(),
          status: z.enum(["upcoming", "cancelled", "completed"]).optional(),
        }),
      }),
    )
    .handler(async ({ input }) => {
      return matchService.updateMatch(input.id, input.data);
    }),

  // Delete match (admin only)
  delete: baseProcedure
    .use(withAdminAuth)
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .handler(async ({ input }) => {
      await matchService.deleteMatch(input.id);
      return { success: true };
    }),

  // Signup procedures nested under matches
  signup: {
    // Sign up for match (authenticated user)
    create: baseProcedure
      .use(withAuth)
      .input(
        z.object({
          matchId: z.string(),
          playerName: z.string().optional(),
          playerEmail: z.string().email().optional(),
          isGuest: z.boolean().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        if (input.isGuest) {
          // Guest signup
          return matchService.signupGuest(input.matchId, {
            playerName: input.playerName!,
            playerEmail: input.playerEmail,
            guestOwnerId: context.user.id,
          });
        } else {
          // Self signup
          return matchService.signupSelf(input.matchId, context.user.id);
        }
      }),

    // Update signup status (admin or owner)
    updateStatus: baseProcedure
      .use(withAuth)
      .input(
        z.object({
          matchId: z.string(),
          signupId: z.string(),
          status: z.enum(["PAID", "PENDING", "CANCELLED"]),
        }),
      )
      .handler(async ({ input, context }) => {
        return matchService.updateSignupStatus(
          input.matchId,
          input.signupId,
          input.status,
          context.user.id,
        );
      }),

    // Remove signup (admin or owner)
    remove: baseProcedure
      .use(withAuth)
      .input(
        z.object({
          matchId: z.string(),
          signupId: z.string(),
        }),
      )
      .handler(async ({ input, context }) => {
        await matchService.removeSignup(
          input.matchId,
          input.signupId,
          context.user.id,
        );
        return { success: true };
      }),

    // Admin add player (admin only)
    addPlayer: baseProcedure
      .use(withAdminAuth)
      .input(
        z.object({
          matchId: z.string(),
          playerName: z.string(),
          playerEmail: z.string().email().optional(),
          status: z.enum(["PAID", "PENDING", "CANCELLED"]).optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        return matchService.adminAddPlayer(
          input.matchId,
          {
            playerName: input.playerName,
            playerEmail: input.playerEmail,
            status: input.status,
          },
          context.user.id,
        );
      }),
  },
};
