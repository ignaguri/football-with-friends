import { getRepositoryFactory } from "@repo/shared/repositories";
import { z } from "zod";

import { baseProcedure } from "./base";

// Get repository instances
const repositoryFactory = getRepositoryFactory();
const locationRepository = repositoryFactory.locations;

// Location procedures
export const locationsProcedures = {
  // Get all locations
  getAll: baseProcedure.handler(async () => {
    return locationRepository.findAll();
  }),

  // Get single location by ID
  getById: baseProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .handler(async ({ input }) => {
      return locationRepository.findById(input.id);
    }),

  // Create location (admin only) - we'll add auth later if needed
  create: baseProcedure
    .input(
      z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        coordinates: z.string().optional(),
        courtCount: z.number().min(1).optional(),
      })
    )
    .handler(async ({ input }) => {
      return locationRepository.create({
        name: input.name,
        address: input.address,
        coordinates: input.coordinates,
        courtCount: input.courtCount || 1,
      });
    }),

  // Update location (admin only) - we'll add auth later if needed
  update: baseProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).optional(),
          address: z.string().optional(),
          coordinates: z.string().optional(),
          courtCount: z.number().min(1).optional(),
        }),
      })
    )
    .handler(async ({ input }) => {
      return locationRepository.update(input.id, input.data);
    }),

  // Delete location (admin only) - we'll add auth later if needed
  delete: baseProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .handler(async ({ input }) => {
      await locationRepository.delete(input.id);
      return { success: true };
    }),
};
