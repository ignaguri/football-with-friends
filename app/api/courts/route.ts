// Court API routes

import { getServiceFactory } from "@/lib/services/factory";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

// GET /api/courts - Get all courts or courts by location
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const serviceFactory = getServiceFactory();
    const courtService = serviceFactory.courtService;

    let courts;
    if (locationId) {
      courts = activeOnly
        ? await courtService.getActiveCourtsByLocationId(locationId)
        : await courtService.getCourtsByLocationId(locationId);
    } else {
      courts = await courtService.getAllCourts();
    }

    return NextResponse.json({ courts });
  } catch (error) {
    console.error("Error fetching courts:", error);
    return NextResponse.json(
      { error: "Failed to fetch courts" },
      { status: 500 },
    );
  }
}

// POST /api/courts - Create a new court
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { locationId, name, description, isActive } = body;

    if (!locationId || !name) {
      return NextResponse.json(
        { error: "Location ID and name are required" },
        { status: 400 },
      );
    }

    const serviceFactory = getServiceFactory();
    const courtService = serviceFactory.courtService;

    const court = await courtService.createCourt({
      locationId,
      name,
      description,
      isActive,
    });

    return NextResponse.json({ court }, { status: 201 });
  } catch (error) {
    console.error("Error creating court:", error);

    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Failed to create court" },
      { status: 500 },
    );
  }
}
