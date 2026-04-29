# Notifications System

Two layers:
1. **Transient push** — Expo Push API (`https://exp.host/--/api/v2/push/send`). Opt-in, native-only (web returns `osStatus: "unsupported"`).
2. **Persistent inbox** — DB-backed, group-scoped, available on web and native. Read via the bell icon in the home-screen header.

## Database Tables

- `push_tokens` — device tokens per user (`migrations/20260407120000-add-push-tokens.ts`).
- `user_notification_prefs` — master toggle + 3 category toggles. Absent row = all on (COALESCE) (`migrations/20260428120000-add-user-notification-prefs.ts`).
- `notifications` — inbox rows: `(id, user_id, group_id, type, category, title, body, data_json, read_at, created_at)`. Indexed on `(user_id, group_id, created_at DESC)` and `(user_id, read_at)` (`migrations/20260429120000-add-notifications-inbox.ts`).

## Types and Categories

Defined in `packages/shared/src/domain/types.ts`:

- `NOTIFICATION_TYPES` — 12 event types: `match_created`, `match_updated`, `match_cancelled`, `player_confirmed`, `substitute_promoted`, `player_cancelled`, `removed_from_match`, `match_reminder`, `payment_reminder`, `voting_open`, `engagement_reminder`, `group_invite`. **Reuse this constant; never redefine.**
- `NOTIFICATION_CATEGORIES` — 3 opt-in categories (`new_match`, `match_reminder`, `promo_to_confirmed`) backed by `user_notification_prefs` columns.

**Delivery rules**:
- Categorized sends honor per-category opt-out; transactional sends honor only the master toggle.
- Inbox persistence is independent of push opt-out — a user with push off still sees inbox rows. The inbox is the canonical history.

## Server Modules

| File | Purpose |
|------|---------|
| `packages/shared/src/services/notification-templates.ts` | Templates — every entry encodes `data.type` and `data.screen` (deep-link) |
| `packages/shared/src/services/notification-service.ts` | Expo push send service |
| `packages/shared/src/repositories/push-token-repository.ts` | Token repo (with prefs JOIN) |
| `packages/shared/src/repositories/notification-inbox-repository.ts` | Inbox repo — `insertMany`, `listByUserAndGroup`, `unreadCount`, `markRead`, `markAllRead`, `deleteOlderThan` |
| `apps/api/src/lib/notification-inbox.ts` | Inbox recorder — `recordForRecipients` |
| `apps/api/src/lib/notify.ts` | Event helpers (call sites) — `notifyMatchCreated`, `notifyMatchUpdated`, `notifyMatchCancelled`, `notifyPlayerConfirmed`, `notifySubstitutePromoted`, `notifyPlayerCancelled`, `notifyRemovedFromMatch`, `notifyGroupInviteTarget` |
| `apps/api/src/cron/send-match-reminders.ts` | Cron: match reminders |
| `apps/api/src/cron/send-engagement-reminders.ts` | Cron: engagement reminders |
| `apps/api/src/cron/prune-inbox-notifications.ts` | Cron: prune inbox rows older than 10 days |

All crons are registered in `apps/api/src/worker.ts` (`scheduled` handler) and exposed as manual trigger endpoints in `apps/api/src/routes/cron.ts`.

**API routes** (`apps/api/src/routes/notifications.ts`):
- `GET /api/notifications` — list, group-scoped
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `POST /api/notifications/send-test` — admin only

Push token and preference endpoints live separately in `push-tokens.ts` / `notification-preferences.ts`.

## Client (mobile-web)

| File | Purpose |
|------|---------|
| `apps/mobile-web/lib/use-push-notifications.ts` | Push setup + listeners (lazy-loaded; web is no-op) |
| `apps/mobile-web/lib/notifications/notification-preferences-context.tsx` | Permission UX + master toggle context |
| `apps/mobile-web/components/notifications/notification-permission-prompt.tsx` | Permission prompt UI |
| `apps/mobile-web/app/(tabs)/profile/notifications.tsx` | Preferences screen (hidden on web) |
| `apps/mobile-web/components/notifications/inbox-bell.tsx` | Bell icon in home-screen header |
| `apps/mobile-web/app/inbox.tsx` | Inbox screen |
| `apps/mobile-web/components/notifications/notification-inbox.tsx` | Inbox list component |
| `packages/api-client/src/notifications-inbox.ts` | React Query hooks: `useNotifications`, `useUnreadNotificationCount`, `useMarkNotificationRead`, `useMarkAllNotificationsRead` |

**Inbox works on both web and native**; the preferences screen does not.

**i18n**: `notifications.*` (preferences UX) and `notifications.inbox.*` (inbox UX) in `locales/{en,es}/common.json`. Type labels: `notifications.inbox.types.<NotificationType>`.

**Deep-link convention**: `payload.data.screen` is the canonical route. Both the push tap handler (`use-push-notifications.ts`) and the inbox screen (`app/inbox.tsx`) navigate via `router.push(getNotificationRoute(data))` from `packages/shared/src/utils/notification-routes.ts`.

## Adding a New Notification

1. Add the type to `NOTIFICATION_TYPES` in `packages/shared/src/domain/types.ts` if it's truly new.
2. Add a template in `notification-templates.ts` (must include `data.type` and `data.screen`).
3. Add a helper in `apps/api/src/lib/notify.ts` that calls `recordForRecipients(...)` first, then `getNotificationService().sendToUsers(...)`. Wrap in `safeNotify`.
4. Wire the helper at the call site (route or cron). For match-related events, intersect recipients with group members (see `getGroupMemberIds` / `intersect` helpers in `notify.ts`).
5. If deep-link logic is non-trivial, extend `getNotificationRoute(data)` in `packages/shared/src/utils/notification-routes.ts`.
6. **Group invites are intentionally NOT persisted to the inbox** — the invite-acceptance flow surfaces them and the target may not yet be a registered user.
7. Do NOT call the Expo Push API directly from feature code.

## Retention

Inbox rows older than 10 days are pruned by `pruneInboxNotifications` (runs every 30 min alongside other crons — cheap, idempotent).
