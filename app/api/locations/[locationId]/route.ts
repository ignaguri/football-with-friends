import { getRepositoryFactory } from "@/lib/repositories/factory";

import type { NextRequest } from "next/server";

// GET /api/locations/[locationId]: Get a specific location
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locationId: string }> },
) {
  try {
    const { locationId } = await context.params;
    const { locations } = getRepositoryFactory();
    const location = await locations.findById(locationId);

    if (!location) {
      return new Response("Location not found", { status: 404 });
    }

    return Response.json({ location });
  } catch (error) {
    console.error("Error fetching location:", error);
    return Response.json(
      { error: "Failed to fetch location" },
      { status: 500 },
    );
  }
}

// PATCH /api/locations/[locationId]: Update a location
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ locationId: string }> },
) {
  try {
    const { locationId } = await context.params;
    const updates = await request.json();
    const { locations } = getRepositoryFactory();

    const updatedLocation = await locations.update(locationId, updates);
    return Response.json({ location: updatedLocation });
  } catch (error) {
    console.error("Error updating location:", error);
    return Response.json(
      { error: "Failed to update location" },
      { status: 500 },
    );
  }
}

// DELETE /api/locations/[locationId]: Delete a location
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ locationId: string }> },
) {
  try {
    const { locationId } = await context.params;
    const { locations, courts, matches } = getRepositoryFactory();

    // Check if location has dependent courts
    const locationCourts = await courts.findByLocationId(locationId);
    if (locationCourts.length > 0) {
      return Response.json(
        {
          error: "Cannot delete location with active courts",
          details: `This location has ${locationCourts.length} court(s) that must be deleted first.`,
        },
        { status: 400 },
      );
    }

    // Check if location has dependent matches
    const locationMatches = await matches.findAll({ locationId });
    if (locationMatches.length > 0) {
      return Response.json(
        {
          error: "Cannot delete location with active matches",
          details: `This location has ${locationMatches.length} match(es) that must be moved or deleted first.`,
        },
        { status: 400 },
      );
    }

    await locations.delete(locationId);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error deleting location:", error);
    return Response.json(
      { error: "Failed to delete location" },
      { status: 500 },
    );
  }
}
