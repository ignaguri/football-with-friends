# Testing Push Notifications Locally

This guide shows you how to test the push notifications feature locally using a copy of your production database (with the migration already applied).

## ✅ What We've Done

1. **Created test database branch** ✅
   - Branch: `football-with-friends-test-notifications`
   - Copied from: `football-with-friends` (production)

2. **Applied migration to test branch** ✅
   - All 4 notification tables created
   - Migration verified successfully

3. **Downloaded test branch locally** ✅
   - File: `football-with-friends-test-notifications-local.db`
   - Includes all production data + notification tables
   - Size: 328 KB with 9 matches, 69 signups, 25 users

## 🧪 Local Testing Setup

### Step 1: Create `.env.local`

Copy from the example:
```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your actual credentials:
```env
STORAGE_PROVIDER=local-db
LOCAL_DATABASE_URL=file:./football-with-friends-test-notifications-local.db

# Copy from your actual .env:
BETTER_AUTH_SECRET=<your-actual-secret>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>

# Use VAPID keys (generate if needed)
NOTIFICATION_PROVIDER=web-push
VAPID_PUBLIC_KEY=<generate-with-pnpm-push:generate-keys>
VAPID_PRIVATE_KEY=<generate-with-pnpm-push:generate-keys>
VAPID_SUBJECT=mailto:admin@football-with-friends.com

NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Step 2: Generate VAPID Keys (if needed)

```bash
pnpm push:generate-keys
```

Copy the keys to your `.env.local` file.

### Step 3: Start Development Server

```bash
pnpm dev
```

The app will now use the local database with notification tables!

## 🧪 Testing Checklist

### Test 1: Verify Database Connection
- [ ] App starts without errors
- [ ] Can view existing matches
- [ ] Can sign in with Google OAuth

### Test 2: Test Push Notification Subscription

1. **Open the app** in your browser (Chrome recommended)
2. **Enable notifications** when prompted
3. **Check browser DevTools**:
   - Open DevTools → Application → Service Workers
   - Verify `sw.js` is registered and activated
   - Go to Application → Push Messaging
   - Check that subscription exists

### Test 3: Test Notification API Routes

Open browser console and run:

```javascript
// Test getting VAPID public key
fetch('/api/push/vapid-key')
  .then(r => r.json())
  .then(console.log);

// Test subscribing (after granting permission)
const permission = await Notification.requestPermission();
if (permission === 'granted') {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: '<VAPID_PUBLIC_KEY>'
  });

  // Send to server
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription })
  }).then(r => r.json());
}
```

### Test 4: Check Database Tables

```bash
# Open SQLite shell
sqlite3 football-with-friends-test-notifications-local.db

# List tables
.tables

# Check push_subscriptions
SELECT * FROM push_subscriptions;

# Check notification_preferences
SELECT * FROM notification_preferences;

# Check notification_queue
SELECT * FROM notification_queue;
```

### Test 5: Test Sending Notification

While signed in as an admin, send a test notification:

```bash
# Using curl (get your session cookie from DevTools)
curl -X POST http://localhost:3000/api/push/test \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=<your-session-token>" \
  -d '{
    "title": "Test Notification",
    "body": "Testing push notifications locally!"
  }'
```

Or use the browser console:
```javascript
await fetch('/api/push/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test Notification',
    body: 'Testing push notifications locally!'
  })
}).then(r => r.json());
```

### Test 6: Test Notification Preferences

```javascript
// Get preferences
await fetch('/api/push/preferences').then(r => r.json());

// Update preferences
await fetch('/api/push/preferences', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    matchReminders: true,
    matchUpdates: true,
    playerChanges: false,
    newMatches: false,
    matchCancelled: true,
    reminderTimes: [24, 2, 0.5],
    quietHoursStart: 22,
    quietHoursEnd: 8,
    timezone: 'Europe/Berlin',
    locationRadiusKm: 10
  })
}).then(r => r.json());
```

### Test 7: Test Queue Processor

```bash
# Process queue (should be empty initially)
pnpm push:process-queue

# Check queue stats
pnpm push:process-queue stats
```

## 🎨 UI Components to Test

### Add to Your Homepage

Create a test page or add to existing homepage:

```tsx
// app/test-notifications/page.tsx
import { PushNotificationBanner } from "@/components/notifications/push-notification-prompt";
import { PushNotificationToggle } from "@/components/notifications/push-notification-prompt";
import { NotificationPreferences } from "@/components/notifications/notification-preferences";

export default function TestNotificationsPage() {
  return (
    <div className="container max-w-4xl py-10 space-y-6">
      <h1 className="text-3xl font-bold">Test Push Notifications</h1>

      <PushNotificationBanner />

      <div className="space-y-6">
        <PushNotificationToggle />
        <NotificationPreferences />
      </div>
    </div>
  );
}
```

Visit `http://localhost:3000/test-notifications`

## 🔍 Debugging

### Check Service Worker Console

1. Open DevTools → Application → Service Workers
2. Click "Inspect" next to your service worker
3. New DevTools window opens showing service worker logs

### Common Issues

**Issue**: Service worker not registering
- **Solution**: Make sure you're on `https://` or `localhost`
- Check browser console for errors

**Issue**: Notifications not appearing
- **Solution**: Check browser permission (should be "granted")
- Check notification settings in system preferences

**Issue**: Can't subscribe to push
- **Solution**: Verify VAPID keys are correct
- Check that service worker is active

**Issue**: Database errors
- **Solution**: Check that `LOCAL_DATABASE_URL` points to the correct file
- Verify file exists: `ls -la football-with-friends-test-notifications-local.db`

## 📊 Database Inspection

### Using SQLite CLI

```bash
sqlite3 football-with-friends-test-notifications-local.db

.tables                    # List all tables
.schema push_subscriptions # Show table schema
SELECT * FROM push_subscriptions; # Query data
```

### Using Turso Dev Server

```bash
turso dev --db-file football-with-friends-test-notifications-local.db
```

Then connect at: `http://127.0.0.1:8080`

### Using GUI Tools

- **TablePlus**: File → New → SQLite → Select db file
- **DBeaver**: Database → New Connection → SQLite → Select db file
- **DB Browser for SQLite**: Open → Select db file

## ✅ Ready for Production?

Once you've tested everything locally and it works:

1. **Apply migration to production**:
   ```bash
   pnpm migrate-remote:up
   ```

2. **Cleanup test branch**:
   ```bash
   turso db destroy football-with-friends-test-notifications
   ```

3. **Remove local test files**:
   ```bash
   rm football-with-friends-test-notifications-local.db
   rm .env.local
   ```

## 📚 Next Steps

- Add `ServiceWorkerProvider` to your root layout
- Add `PushNotificationBanner` to your homepage
- Integrate notification triggers in your API routes
- Setup queue processor for production
- Monitor notification delivery

See [QUICKSTART_NOTIFICATIONS.md](../QUICKSTART_NOTIFICATIONS.md) for production setup.
