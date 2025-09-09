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
