// @ts-nocheck - Tamagui type recursion workaround
import {
  type InboxNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useUnreadNotificationCount,
} from "@repo/api-client";
import { getNotificationRoute } from "@repo/shared/utils";
import { Button, Text } from "@repo/ui";
import { router, Stack } from "expo-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "tamagui";

import { NotificationInbox } from "../components/notifications/notification-inbox";

export default function InboxScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { data: unread } = useUnreadNotificationCount();

  const handleItemPress = useCallback(
    (item: InboxNotification) => {
      if (!item.readAt) {
        markRead.mutate(item.id);
      }
      const route = getNotificationRoute(item.data);
      // expo-router types accept string for dynamic routes; cast keeps TS quiet.
      router.push(route as never);
    },
    [markRead.mutate],
  );

  const showMarkAll = (unread?.unreadCount ?? 0) > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: t("notifications.inbox.title"),
          headerStyle: { backgroundColor: theme.background?.val },
          headerTintColor: theme.color?.val,
          headerRight: () =>
            showMarkAll ? (
              <Button
                size="$2"
                variant="ghost"
                onPress={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                accessibilityLabel={t("notifications.inbox.markAllRead")}
                testID="inbox-mark-all-read"
              >
                <Text fontSize="$3">{t("notifications.inbox.markAllRead")}</Text>
              </Button>
            ) : null,
        }}
      />
      <NotificationInbox onItemPress={handleItemPress} />
    </>
  );
}
