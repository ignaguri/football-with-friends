// API route for unsubscribing from push notifications

import { auth } from "@/lib/auth";
import { getDatabase } from "@/lib/database/connection";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

const db = getDatabase();

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { endpoint, unsubscribeAll } = body;

    if (unsubscribeAll) {
      // Unsubscribe from all devices for this user
      await db
        .updateTable("push_subscriptions")
        .set({ active: false })
        .where("user_id", "=", session.user.id)
        .execute();

      return NextResponse.json({
        success: true,
        message: "Unsubscribed from all devices",
      });
    }

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required" },
        { status: 400 },
      );
    }

    // Unsubscribe from specific endpoint
    const result = await db
      .updateTable("push_subscriptions")
      .set({ active: false })
      .where("endpoint", "=", endpoint)
      .where("user_id", "=", session.user.id)
      .execute();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Unsubscribed successfully",
    });
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe from push notifications" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const endpoint = url.searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint parameter is required" },
        { status: 400 },
      );
    }

    // Permanently delete the subscription
    const result = await db
      .deleteFrom("push_subscriptions")
      .where("endpoint", "=", endpoint)
      .where("user_id", "=", session.user.id)
      .execute();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subscription deleted permanently",
    });
  } catch (error) {
    console.error("Error deleting push subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 },
    );
  }
}
