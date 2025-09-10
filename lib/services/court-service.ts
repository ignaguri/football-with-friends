// Court service for business logic and validation

import type {
  Court,
  CreateCourtData,
  UpdateCourtData,
} from "@/lib/domain/types";
import type { CourtRepository } from "@/lib/repositories/interfaces";

export class CourtService {
  constructor(private courtRepository: CourtRepository) {}

  /**
   * Get all courts
   */
  async getAllCourts(): Promise<Court[]> {
    return this.courtRepository.findAll();
  }

  /**
   * Get courts by location ID
   */
  async getCourtsByLocationId(locationId: string): Promise<Court[]> {
    return this.courtRepository.findByLocationId(locationId);
  }

  /**
   * Get active courts by location ID
   */
  async getActiveCourtsByLocationId(locationId: string): Promise<Court[]> {
    return this.courtRepository.findActiveByLocationId(locationId);
  }

  /**
   * Get court by ID
   */
  async getCourtById(id: string): Promise<Court | null> {
    return this.courtRepository.findById(id);
  }

  /**
   * Get court by ID with location details
   */
  async getCourtByIdWithLocation(id: string): Promise<Court | null> {
    return this.courtRepository.findByIdWithLocation(id);
  }

  /**
   * Create a new court
   */
  async createCourt(courtData: CreateCourtData): Promise<Court> {
    // Validate that court name is unique within the location
    const existingCourt = await this.courtRepository.existsByName(
      courtData.locationId,
      courtData.name,
    );

    if (existingCourt) {
      throw new Error(
        `A court with the name "${courtData.name}" already exists at this location`,
      );
    }

    return this.courtRepository.create(courtData);
  }

  /**
   * Update an existing court
   */
  async updateCourt(id: string, updates: UpdateCourtData): Promise<Court> {
    // Get the existing court to validate location
    const existingCourt = await this.courtRepository.findById(id);
    if (!existingCourt) {
      throw new Error(`Court with id ${id} not found`);
    }

    // If name is being updated, validate uniqueness
    if (updates.name && updates.name !== existingCourt.name) {
      const nameExists = await this.courtRepository.existsByName(
        existingCourt.locationId,
        updates.name,
        id,
      );

      if (nameExists) {
        throw new Error(
          `A court with the name "${updates.name}" already exists at this location`,
        );
      }
    }

    return this.courtRepository.update(id, updates);
  }

  /**
   * Delete a court
   */
  async deleteCourt(id: string): Promise<void> {
    const existingCourt = await this.courtRepository.findById(id);
    if (!existingCourt) {
      throw new Error(`Court with id ${id} not found`);
    }

    // TODO: Check if court is being used in any matches
    // For now, we'll allow deletion but this should be validated in the future

    return this.courtRepository.delete(id);
  }

  /**
   * Get court count for a location
   */
  async getCourtCountByLocationId(locationId: string): Promise<number> {
    return this.courtRepository.getCountByLocationId(locationId);
  }

  /**
   * Validate that a court belongs to a specific location
   */
  async validateCourtBelongsToLocation(
    courtId: string,
    locationId: string,
  ): Promise<boolean> {
    const court = await this.courtRepository.findById(courtId);
    return court?.locationId === locationId;
  }
}
