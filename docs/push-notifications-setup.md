# Push Notifications Setup Guide

This guide will walk you through completing the push notifications setup for the Football with Friends application.

## 📋 Overview

Push notifications have been implemented with the following components:
- ✅ Database schema (migration ready)
- ✅ Service worker with push handlers
- ✅ Web Push provider implementation
- ✅ API routes (subscribe, unsubscribe, preferences, test)
- ✅ Frontend components (permission prompts, preferences UI)
- ✅ Queue processor for scheduled notifications
- ✅ Notification service with business logic

## 🚀 Setup Steps

### 1. Generate VAPID Keys

```bash
pnpm push:generate-keys
```

This will create a `.env.vapid` file with your VAPID keys. Copy the values to your `.env` file:

```env
NOTIFICATION_PROVIDER=web-push
VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
VAPID_SUBJECT=mailto:your-email@example.com
```

**⚠️ Important:**
- Add `.env.vapid` to your `.gitignore`
- Never commit `VAPID_PRIVATE_KEY` to version control
- Use different keys for development/staging/production

### 2. Run Database Migration

```bash
# Check migration status
pnpm migrate:status

# Run the migration
pnpm migrate:up
```

This creates 4 new tables:
- `push_subscriptions` - User device subscriptions
- `notification_preferences` - User notification settings
- `notification_queue` - Scheduled notifications
- `notification_history` - Sent notification tracking

### 3. Add Service Worker Provider to App

Edit your root layout (`app/layout.tsx`) to include the service worker provider:

```tsx
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ServiceWorkerProvider>
          {/* your existing providers */}
          {children}
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
```

### 4. Add Notification Permission Prompt

Add the prompt to your homepage or dashboard:

```tsx
import { PushNotificationBanner } from "@/components/notifications/push-notification-prompt";

export default function HomePage() {
  return (
    <div>
      <PushNotificationBanner />
      {/* rest of your page */}
    </div>
  );
}
```

Or use the card version in a specific location:

```tsx
import { PushNotificationPrompt } from "@/components/notifications/push-notification-prompt";

<PushNotificationPrompt onDismiss={() => console.log("Dismissed")} />
```

### 5. Add Notification Preferences Page

Create a settings page for notification preferences:

```tsx
// app/settings/notifications/page.tsx
import { NotificationPreferences } from "@/components/notifications/notification-preferences";
import { PushNotificationToggle } from "@/components/notifications/push-notification-prompt";

export default function NotificationSettingsPage() {
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

### 6. Integrate with Match Actions

Add notification triggers to your match API routes:

#### When creating a match:
```tsx
// app/api/matches/route.ts
import { scheduleMatchReminders, notifyNewMatch } from "@/lib/notifications/notification-triggers";

export async function POST(request: Request) {
  // ... your existing match creation code
  const match = await matchService.createMatch(data, user);

  // Trigger notifications (runs async, won't block response)
  scheduleMatchReminders(match.id).catch(console.error);
  notifyNewMatch(match.id).catch(console.error);

  return Response.json(match);
}
```

#### When a user signs up:
```tsx
// app/api/matches/[matchId]/signup/route.ts
import { notifyPlayerJoined, scheduleMatchReminders } from "@/lib/notifications/notification-triggers";

export async function POST(request: Request) {
  // ... your existing signup code
  const signup = await matchService.signUpUser(matchId, user);

  // Notify organizer and schedule reminders for this user
  notifyPlayerJoined(matchId, user.name).catch(console.error);
  scheduleMatchReminders(matchId).catch(console.error);

  return Response.json(signup);
}
```

#### When updating a match:
```tsx
// app/api/matches/[matchId]/route.ts (PATCH/PUT)
import { notifyMatchUpdate } from "@/lib/notifications/notification-triggers";

export async function PATCH(request: Request) {
  // ... your existing update code
  const updated = await matchService.updateMatch(matchId, updates, user);

  // Determine change type based on what was updated
  let changeType: "time" | "location" | "court" | "cost" | "general" = "general";
  if (updates.date || updates.time) changeType = "time";
  else if (updates.locationId) changeType = "location";
  else if (updates.courtId) changeType = "court";
  else if (updates.costPerPlayer) changeType = "cost";

  notifyMatchUpdate(matchId, changeType).catch(console.error);

  return Response.json(updated);
}
```

#### When cancelling a match:
```tsx
// When setting status to 'cancelled'
import { notifyMatchCancellation } from "@/lib/notifications/notification-triggers";

await matchService.updateMatch(matchId, { status: "cancelled" }, user);
notifyMatchCancellation(matchId, "Match cancelled by organizer").catch(console.error);
```

### 7. Setup Queue Processor

The queue processor sends scheduled notifications. You have several options:

#### Option A: Manual Processing (Development)
```bash
# Process queue once
pnpm push:process-queue

# View queue statistics
pnpm push:process-queue stats

# Run continuously (every 60 seconds)
pnpm push:process-queue watch
```

#### Option B: Cron Job (Production - Linux/Mac)
Add to your crontab:
```bash
# Process every minute
* * * * * cd /path/to/app && pnpm push:process-queue >> /var/log/notifications.log 2>&1
```

#### Option C: System Service (Production - systemd)
Create `/etc/systemd/system/push-notifications.service`:
```ini
[Unit]
Description=Push Notification Queue Processor
After=network.target

[Service]
Type=simple
User=your-app-user
WorkingDirectory=/path/to/app
ExecStart=/usr/bin/pnpm push:process-queue watch
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable push-notifications
sudo systemctl start push-notifications
sudo systemctl status push-notifications
```

#### Option D: Vercel Cron (Vercel Deployment)
Create a cron API route:

```tsx
// app/api/cron/process-notifications/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Import and run processor logic
  // ... process notifications ...

  return NextResponse.json({ success: true });
}
```

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/process-notifications",
    "schedule": "* * * * *"
  }]
}
```

## 🧪 Testing

### Test Push Notification
```bash
# Make sure you're authenticated and have subscribed to notifications
curl -X POST http://localhost:3000/api/push/test \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"title": "Test", "body": "Testing push notifications!"}'
```

### Test in Browser DevTools
1. Open DevTools → Application → Service Workers
2. Check that `sw.js` is registered and activated
3. Go to Application → Push Messaging
4. Send a test notification

### Test Notification Flow
1. Create a match → Should schedule reminders in queue
2. Sign up for a match → Should schedule reminders for that user
3. Update match time → Should notify all signed-up players
4. Cancel match → Should notify all players and cancel reminders

## 📊 Monitoring

### Check Queue Status
```bash
pnpm push:process-queue stats
```

### View Database Stats
```sql
-- Pending notifications
SELECT COUNT(*) FROM notification_queue WHERE sent_at IS NULL AND failed_at IS NULL;

-- Failed notifications
SELECT COUNT(*) FROM notification_queue WHERE failed_at IS NOT NULL;

-- Active subscriptions
SELECT COUNT(*) FROM push_subscriptions WHERE active = true;

-- Recent notifications
SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT 10;
```

### Logs to Monitor
- Service worker logs: Browser DevTools Console
- API route logs: Server logs
- Queue processor logs: `pnpm push:process-queue` output
- Notification delivery: Check `notification_history` table

## 🔧 Troubleshooting

### Service Worker Not Registering
- Check that you're on HTTPS (or localhost)
- Clear browser cache and service workers
- Check DevTools → Application → Service Workers for errors

### Notifications Not Appearing
- Check browser notification permission (should be "granted")
- Check push subscription exists: DevTools → Application → Push Messaging
- Verify VAPID keys are correct
- Check browser console for errors

### Queue Not Processing
- Ensure queue processor is running
- Check database connection
- Look for errors in processor logs
- Verify notification_queue table has entries

### Notifications Going to Wrong Users
- Check `notification_preferences` table for user settings
- Verify signup records in database
- Check quiet hours settings

## 🎨 Customization

### Notification Icons
Place icons in `public/icons/`:
- `icon-192x192.png` - Standard notification icon
- `badge-72x72.png` - Badge for mobile notifications

### Notification Sound
Browsers use system notification sounds by default. To customize:
```tsx
// In service worker (app/sw.ts)
const options: NotificationOptions = {
  // ...
  vibrate: [200, 100, 200], // Vibration pattern
  silent: false, // Enable sound
};
```

### Notification Actions
Customize actions in `lib/notifications/notification-service.ts`:
```tsx
actions: [
  {
    action: "view",
    title: "View Match",
    url: `/matches/${matchId}`,
  },
  {
    action: "directions",
    title: "Get Directions",
    url: `/matches/${matchId}/directions`,
  },
],
```

## 📝 Next Steps

1. ✅ Complete all setup steps above
2. ⚠️ Test notifications in development
3. ⚠️ Deploy to staging and test
4. ⚠️ Setup queue processor in production
5. ⚠️ Monitor notification delivery rates
6. ⚠️ Gather user feedback on notification preferences
7. ⚠️ Consider adding more notification types (match results, etc.)

## 🔗 Related Files

- **Service Worker**: `app/sw.ts`
- **API Routes**: `app/api/push/**/*.ts`
- **Notification Service**: `lib/notifications/notification-service.ts`
- **Components**: `components/notifications/*.tsx`
- **Migration**: `migrations/20250918171250-add-push-notifications.ts`
- **Scripts**: `scripts/generate-vapid-keys.ts`, `scripts/process-notification-queue.ts`

## 📚 Additional Resources

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Protocol](https://datatracker.ietf.org/doc/html/rfc8292)
- [web-push npm package](https://github.com/web-push-libs/web-push)
