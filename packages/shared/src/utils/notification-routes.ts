// Single resolver shared by push-tap (use-push-notifications.ts) and
// inbox-tap (app/inbox.tsx). Keeps deep-link logic in one place if templates
// ever need conditional routing — today templates already set `data.screen`,
// so this is mostly a passthrough with type-based fallbacks.

import {
  NOTIFICATION_TYPES,
  type NotificationPayload,
  type NotificationType,
} from "../domain/types";

const FALLBACK_ROUTE = "/(tabs)";
const MATCHES_ROUTE = "/(tabs)/matches";

const MATCHES_FALLBACK_TYPES = new Set<NotificationType>([
  NOTIFICATION_TYPES.MATCH_CREATED,
  NOTIFICATION_TYPES.MATCH_UPDATED,
  NOTIFICATION_TYPES.MATCH_CANCELLED,
  NOTIFICATION_TYPES.MATCH_REMINDER,
  NOTIFICATION_TYPES.PLAYER_CONFIRMED,
  NOTIFICATION_TYPES.SUBSTITUTE_PROMOTED,
  NOTIFICATION_TYPES.PLAYER_CANCELLED,
  NOTIFICATION_TYPES.REMOVED_FROM_MATCH,
  NOTIFICATION_TYPES.PAYMENT_REMINDER,
  NOTIFICATION_TYPES.VOTING_OPEN,
]);

export function getNotificationRoute(data: NotificationPayload["data"] | null | undefined): string {
  if (!data) return FALLBACK_ROUTE;
  const screen = (data as { screen?: unknown }).screen;
  if (typeof screen === "string" && screen.length > 0) {
    return screen;
  }
  const type = (data as { type?: unknown }).type as NotificationType | undefined;
  if (type && MATCHES_FALLBACK_TYPES.has(type)) return MATCHES_ROUTE;
  return FALLBACK_ROUTE;
}
