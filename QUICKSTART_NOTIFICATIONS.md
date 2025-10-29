# Push Notifications - Quick Start ⚡

Get push notifications running in 5 minutes!

## 🚀 Quick Setup

### 1. Generate Keys (30 seconds)
```bash
pnpm push:generate-keys
```

Copy the output to your `.env` file:
```env
NOTIFICATION_PROVIDER=web-push
VAPID_PUBLIC_KEY=<generated_key>
VAPID_PRIVATE_KEY=<generated_key>
VAPID_SUBJECT=mailto:admin@football-with-friends.com
```

### 2. Run Migration (10 seconds)
```bash
pnpm migrate:up
```

### 3. Add Service Worker Provider (2 minutes)

Find your root layout and wrap your app:

```tsx
// app/layout.tsx
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ServiceWorkerProvider>
          {children}
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
```

### 4. Add Notification Prompt (1 minute)

Add to your homepage or dashboard:

```tsx
// app/page.tsx or app/dashboard/page.tsx
import { PushNotificationBanner } from "@/components/notifications/push-notification-prompt";

export default function Page() {
  return (
    <>
      <PushNotificationBanner />
      {/* rest of your page */}
    </>
  );
}
```

### 5. Test It! (1 minute)

```bash
# Start dev server
pnpm dev

# Open http://localhost:3000
# Click "Enable Notifications" in the banner
# Grant permission when prompted

# Test notification (in another terminal)
curl -X POST http://localhost:3000/api/push/test \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"title": "Test", "body": "It works!"}'
```

## 🎯 Add Notifications to Your Features

### When a match is created:
```tsx
import { scheduleMatchReminders } from "@/lib/notifications/notification-triggers";

// After creating match
scheduleMatchReminders(match.id).catch(console.error);
```

### When someone signs up:
```tsx
import { notifyPlayerJoined } from "@/lib/notifications/notification-triggers";

// After signup
notifyPlayerJoined(matchId, user.name).catch(console.error);
```

### When match is updated:
```tsx
import { notifyMatchUpdate } from "@/lib/notifications/notification-triggers";

// After update
notifyMatchUpdate(matchId, "time").catch(console.error);
```

### When match is cancelled:
```tsx
import { notifyMatchCancellation } from "@/lib/notifications/notification-triggers";

// When cancelling
notifyMatchCancellation(matchId, "Weather").catch(console.error);
```

## 🔄 Setup Queue Processor

The queue sends scheduled notifications (reminders). Choose one:

### Option 1: Dev/Testing (run manually)
```bash
pnpm push:process-queue watch
```

### Option 2: Production Cron (runs automatically)
```bash
# Add to crontab (processes every minute)
* * * * * cd /path/to/app && pnpm push:process-queue
```

### Option 3: Vercel Cron (serverless)
See [full setup guide](docs/push-notifications-setup.md#option-d-vercel-cron-vercel-deployment)

## 📱 Add Settings Page (Optional)

```tsx
// app/settings/notifications/page.tsx
import { NotificationPreferences } from "@/components/notifications/notification-preferences";
import { PushNotificationToggle } from "@/components/notifications/push-notification-prompt";

export default function NotificationsPage() {
  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-6">Notification Settings</h1>
      <div className="space-y-6">
        <PushNotificationToggle />
        <NotificationPreferences />
      </div>
    </div>
  );
}
```

## ✅ You're Done!

Your app now has:
- ✅ Push notifications for match reminders
- ✅ Notifications for player changes
- ✅ Notifications for match updates
- ✅ User preference management
- ✅ PWA capabilities

## 📚 Full Documentation

- **Setup Guide**: [docs/push-notifications-setup.md](docs/push-notifications-setup.md)
- **Integration Examples**: [docs/push-notifications-integration-examples.md](docs/push-notifications-integration-examples.md)
- **Implementation Status**: [docs/PUSH_NOTIFICATIONS_STATUS.md](docs/PUSH_NOTIFICATIONS_STATUS.md)
- **Original PRD**: [docs/pwa-push-notifications-prd.md](docs/pwa-push-notifications-prd.md)

## 🐛 Troubleshooting

**Notifications not appearing?**
- Check browser permission (should be "granted")
- Check DevTools → Application → Service Workers
- Verify VAPID keys in `.env`

**Service worker not loading?**
- Must use HTTPS or localhost
- Clear browser cache
- Check browser console for errors

**Queue not processing?**
- Ensure `pnpm push:process-queue watch` is running
- Check database for entries: `SELECT * FROM notification_queue`
- Look for errors in processor logs

## 🎉 What's Next?

1. Test notifications on real devices
2. Customize notification messages in `lib/notifications/notification-service.ts`
3. Monitor delivery rates in `notification_history` table
4. Gather user feedback
5. Deploy to production!

---

**Need Help?** Check the [full setup guide](docs/push-notifications-setup.md#-troubleshooting) or review the [integration examples](docs/push-notifications-integration-examples.md).
