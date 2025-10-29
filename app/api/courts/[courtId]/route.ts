// Individual court API routes

import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

import { getServiceFactory } from "@/lib/services/factory";

// GET /api/courts/[courtId] - Get court by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courtId: string }> },
) {
  try {
    const { courtId } = await params;
    const { searchParams } = new URL(req.url);
    const includeLocation = searchParams.get("includeLocation") === "true";

    const serviceFactory = getServiceFactory();
    const courtService = serviceFactory.courtService;

    const court = includeLocation
      ? await courtService.getCourtByIdWithLocation(courtId)
      : await courtService.getCourtById(courtId);

    if (!court) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    return NextResponse.json({ court });
  } catch (error) {
    console.error("Error fetching court:", error);
    return NextResponse.json(
      { error: "Failed to fetch court" },
      { status: 500 },
    );
  }
}

// PUT /api/courts/[courtId] - Update court
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ courtId: string }> },
) {
  try {
    const { courtId } = await params;
    const body = await req.json();
    const { name, description, isActive } = body;

    const serviceFactory = getServiceFactory();
    const courtService = serviceFactory.courtService;

    const court = await courtService.updateCourt(courtId, {
      name,
      description,
      isActive,
    });

    return NextResponse.json({ court });
  } catch (error) {
    console.error("Error updating court:", error);

    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update court" },
      { status: 500 },
    );
  }
}

// DELETE /api/courts/[courtId] - Delete court
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courtId: string }> },
) {
  try {
    const { courtId } = await params;

    const serviceFactory = getServiceFactory();
    const courtService = serviceFactory.courtService;

    await courtService.deleteCourt(courtId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting court:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete court" },
      { status: 500 },
    );
  }
}
