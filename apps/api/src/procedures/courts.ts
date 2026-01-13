import { getServiceFactory } from "@repo/shared/services";
import { z } from "zod";

import { adminProcedure, baseProcedure } from "./base";

// Get service instances
const serviceFactory = getServiceFactory();
const courtService = serviceFactory.courtService;

// Court procedures
export const courtsProcedures = {
  // Get all courts
  getAll: baseProcedure
    .input(
      z
        .object({
          locationId: z.string().optional(),
        })
        .optional()
    )
    .handler(async ({ input }) => {
      return courtService.getAllCourts(input?.locationId);
    }),

  // Get single court by ID
  getById: baseProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .handler(async ({ input }) => {
      return courtService.getCourtById(input.id);
    }),

  // Create court (admin only)
  create: adminProcedure
    .input(
      z.object({
        locationId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .handler(async ({ input }) => {
      return courtService.createCourt({
        locationId: input.locationId,
        name: input.name,
        description: input.description,
        isActive: input.isActive ?? true,
      });
    }),

  // Update court (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .handler(async ({ input }) => {
      return courtService.updateCourt(input.id, input.data);
    }),

  // Delete court (admin only)
  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .handler(async ({ input }) => {
      await courtService.deleteCourt(input.id);
      return { success: true };
    }),
};
