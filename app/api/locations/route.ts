import type { NextRequest } from "next/server";

import { getRepositoryFactory } from "@/lib/repositories/factory";

// GET /api/locations: Returns all locations
export async function GET() {
  try {
    const { locations } = getRepositoryFactory();
    const allLocations = await locations.findAll();

    return Response.json({ locations: allLocations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return Response.json(
      { error: "Failed to fetch locations" },
      { status: 500 },
    );
  }
}

// POST /api/locations: Create a new location
export async function POST(request: NextRequest) {
  try {
    const locationData = await request.json();
    const { locations } = getRepositoryFactory();

    const newLocation = await locations.create(locationData);
    return Response.json({ location: newLocation }, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);
    return Response.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }
}
