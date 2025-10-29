// API route for testing push notifications (development only)

import { auth } from "@/lib/auth";
import { NotificationService } from "@/lib/notifications/notification-service";
import { NextResponse } from "next/server";

import type { NotificationType } from "@/lib/notifications/types";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // Only allow in development or for admins
  if (process.env.NODE_ENV === "production") {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

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
    const { type = "test", title, body: notificationBody } = body;

    const notificationService = new NotificationService();

    // Create a test notification
    const testNotification = {
      userId: session.user.id,
      type: "match_reminder" as NotificationType,
      title: title || "Test Notification",
      body:
        notificationBody ||
        "This is a test push notification from Football with Friends!",
      data: {
        test: true,
        timestamp: new Date().toISOString(),
      },
      urgent: false,
    };

    const result = await notificationService["provider"].send(testNotification);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Test notification sent successfully"
        : "Failed to send test notification",
      deliveredTo: result.deliveredTo,
      error: result.error,
    });
  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 },
    );
  }
}
