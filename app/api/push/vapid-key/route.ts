// API route to provide VAPID public key for push subscription

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      return NextResponse.json(
        { error: "VAPID public key not configured" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      publicKey: vapidPublicKey,
    });
  } catch (error) {
    console.error("Error providing VAPID public key:", error);
    return NextResponse.json(
      { error: "Failed to provide VAPID key" },
      { status: 500 },
    );
  }
}
