# Push Notifications Integration Examples

Quick copy-paste examples for integrating push notifications into your API routes.

## 🎯 Match Creation

```tsx
// app/api/matches/route.ts
import { scheduleMatchReminders, notifyNewMatch } from "@/lib/notifications/notification-triggers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const body = await request.json();

    // Create match (your existing code)
    const match = await matchService.createMatch(body, session.user);

    // 🔔 Trigger notifications (async, won't block response)
    Promise.all([
      scheduleMatchReminders(match.id),
      notifyNewMatch(match.id),
    ]).catch((error) => {
      console.error("Notification error:", error);
      // Log to Sentry if needed
    });

    return NextResponse.json(match);
  } catch (error) {
    // Handle error
  }
}
```

## 👤 Player Signup

```tsx
// app/api/matches/[matchId]/signup/route.ts
import { notifyPlayerJoined, scheduleMatchReminders } from "@/lib/notifications/notification-triggers";

export async function POST(request: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const matchId = params.matchId;

    // Sign up user (your existing code)
    const signup = await matchService.signUpUser(matchId, session.user);

    // 🔔 Notify organizer and schedule reminders for this user
    Promise.all([
      notifyPlayerJoined(matchId, session.user.name || session.user.email),
      scheduleMatchReminders(matchId),
    ]).catch(console.error);

    return NextResponse.json(signup);
  } catch (error) {
    // Handle error
  }
}
```

## 🚪 Player Cancellation

```tsx
// app/api/matches/[matchId]/cancel-signup/route.ts
import { notifyPlayerLeft } from "@/lib/notifications/notification-triggers";

export async function POST(request: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const matchId = params.matchId;

    // Cancel signup (your existing code)
    await matchService.cancelSignup(matchId, session.user.id);

    // 🔔 Notify organizer
    notifyPlayerLeft(matchId, session.user.name || session.user.email).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle error
  }
}
```

## ✏️ Match Updates

```tsx
// app/api/matches/[matchId]/route.ts (PATCH)
import { notifyMatchUpdate } from "@/lib/notifications/notification-triggers";

export async function PATCH(request: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const matchId = params.matchId;
    const updates = await request.json();

    // Update match (your existing code)
    const updated = await matchService.updateMatch(matchId, updates, session.user);

    // 🔔 Determine notification type based on what changed
    let changeType: "time" | "location" | "court" | "cost" | "general" = "general";

    if (updates.date || updates.time) {
      changeType = "time";
    } else if (updates.locationId) {
      changeType = "location";
    } else if (updates.courtId) {
      changeType = "court";
    } else if (updates.costPerPlayer || updates.shirtCost) {
      changeType = "cost";
    }

    notifyMatchUpdate(matchId, changeType).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    // Handle error
  }
}
```

## ❌ Match Cancellation

```tsx
// app/api/matches/[matchId]/cancel/route.ts
import { notifyMatchCancellation } from "@/lib/notifications/notification-triggers";

export async function POST(request: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const matchId = params.matchId;
    const { reason } = await request.json();

    // Cancel match (your existing code)
    await matchService.updateMatch(matchId, { status: "cancelled" }, session.user);

    // 🔔 Notify all players and cancel scheduled reminders
    notifyMatchCancellation(matchId, reason || "Match cancelled by organizer").catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle error
  }
}
```

## 🎨 Custom Notification

If you need to send a custom notification that doesn't fit the predefined types:

```tsx
import { NotificationService } from "@/lib/notifications/notification-service";

const notificationService = new NotificationService();

// Send immediately
await notificationService["provider"].send({
  userId: "user-id",
  type: "match_reminder", // or any NotificationType
  title: "Custom Notification",
  body: "Your custom message here",
  data: {
    matchId: "match-id",
    customField: "custom-value",
  },
  urgent: false,
  actions: [
    {
      action: "view",
      title: "View",
      url: "/matches/match-id",
    },
  ],
});

// Or schedule for later
await notificationService["provider"].scheduleNotification({
  userId: "user-id",
  type: "match_reminder",
  title: "Scheduled Notification",
  body: "This will be sent later",
  scheduledFor: new Date("2025-01-01T10:00:00Z"),
  priority: "high",
  data: { matchId: "match-id" },
});
```

## 🔄 Bulk Notifications

For sending to multiple users at once:

```tsx
import { NotificationService } from "@/lib/notifications/notification-service";

const notificationService = new NotificationService();
const notifications = users.map((user) => ({
  userId: user.id,
  type: "new_match" as const,
  title: "New Match Available!",
  body: "A new match has been created in your area",
  data: { matchId: match.id },
}));

await notificationService["provider"].sendBulk(notifications);
```

## 🎯 Service Integration (Alternative to API Routes)

If you want to call notifications directly from your service layer:

```tsx
// lib/services/match-service.ts
import { NotificationService } from "@/lib/notifications/notification-service";

export class MatchService {
  private notificationService: NotificationService;

  constructor(/* your dependencies */) {
    this.notificationService = new NotificationService();
  }

  async createMatch(data: CreateMatchData, user: User): Promise<Match> {
    // Create match
    const match = await this.matchRepository.create(data);

    // Schedule reminders in background
    this.notificationService
      .scheduleMatchReminders(match.id)
      .catch(console.error);

    // Notify interested users
    this.notificationService
      .notifyNewMatch(match.id)
      .catch(console.error);

    return match;
  }
}
```

## 🚨 Error Handling Best Practices

```tsx
import { notifyMatchUpdate } from "@/lib/notifications/notification-triggers";

// ✅ GOOD: Don't let notification failures break the main flow
try {
  const match = await updateMatch(matchId, data);

  // Send notification in background
  notifyMatchUpdate(matchId, "time")
    .catch((error) => {
      console.error("Failed to send notification:", error);
      // Optionally log to monitoring service (Sentry, etc.)
      captureException(error, {
        tags: { feature: "notifications" },
        extra: { matchId },
      });
    });

  return match;
} catch (error) {
  // Handle main operation error
  throw error;
}

// ❌ BAD: Don't await notifications - it slows down responses
try {
  const match = await updateMatch(matchId, data);
  await notifyMatchUpdate(matchId, "time"); // This blocks the response!
  return match;
} catch (error) {
  throw error;
}
```

## 🧪 Testing Notifications

```tsx
// app/api/admin/test-notification/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  // Only allow admins in development
  if (process.env.NODE_ENV === "production" && session?.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId, title, body } = await request.json();

  const notificationService = new NotificationService();
  const result = await notificationService["provider"].send({
    userId: userId || session.user.id,
    type: "match_reminder",
    title: title || "Test Notification",
    body: body || "This is a test notification",
    data: { test: true },
  });

  return NextResponse.json(result);
}
```

## 📱 Frontend Integration

### Show notification prompt on homepage

```tsx
// app/page.tsx
import { PushNotificationBanner } from "@/components/notifications/push-notification-prompt";

export default function HomePage() {
  return (
    <>
      <PushNotificationBanner />
      {/* Rest of your homepage */}
    </>
  );
}
```

### Add settings link in navigation

```tsx
// components/navigation.tsx
import { Bell } from "lucide-react";

<Link href="/settings/notifications">
  <Bell className="h-5 w-5" />
  <span>Notifications</span>
</Link>
```

### Show subscription status

```tsx
// components/user-menu.tsx
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function UserMenu() {
  const { isSubscribed } = usePushNotifications();

  return (
    <div>
      {isSubscribed ? (
        <Badge variant="success">Notifications On</Badge>
      ) : (
        <Badge variant="secondary">Notifications Off</Badge>
      )}
    </div>
  );
}
```

## 🎨 Customizing Notification Content

Edit the notification builders in `lib/notifications/notification-service.ts`:

```tsx
private buildMatchReminderNotification(
  context: MatchNotificationContext,
  userId: string,
  reminderType: "24h" | "2h" | "30m",
): NotificationRequest {
  // Customize your notification text here
  const timeText = {
    "24h": "tomorrow",
    "2h": "in 2 hours",
    "30m": "in 30 minutes ⚽",
  }[reminderType];

  return {
    userId,
    type: "match_reminder",
    title: `⚽ Match ${timeText}!`,
    body: `Don't forget: ${context.match.location} at ${context.match.time}`,
    // ... rest of notification
  };
}
```

## 📊 Monitoring Integration

```tsx
import { captureMessage } from "@sentry/nextjs";

// Log successful notifications
notifyPlayerJoined(matchId, playerName)
  .then(() => {
    captureMessage("Player joined notification sent", {
      level: "info",
      extra: { matchId, playerName },
    });
  })
  .catch((error) => {
    captureException(error, {
      tags: { feature: "notifications", type: "player_joined" },
      extra: { matchId, playerName },
    });
  });
```
