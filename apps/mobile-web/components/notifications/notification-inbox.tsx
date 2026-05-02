// @ts-nocheck - Tamagui type recursion workaround
import { type InboxNotification, useNotifications } from "@repo/api-client";
import { Spinner, Text, YStack } from "@repo/ui";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl } from "react-native";

import { InboxEmpty } from "./inbox-empty";
import { InboxRow } from "./inbox-row";

interface NotificationInboxProps {
  onItemPress: (item: InboxNotification) => void;
}

export function NotificationInbox({ onItemPress }: NotificationInboxProps) {
  const { t } = useTranslation();
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotifications();

  const items: InboxNotification[] = data?.pages.flatMap((p) => p.items) ?? [];

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: InboxNotification }) => <InboxRow item={item} onPress={onItemPress} />,
    [onItemPress],
  );

  const keyExtractor = useCallback((item: InboxNotification) => item.id, []);

  if (isLoading && items.length === 0) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  if (items.length === 0) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        // FlatList ListEmptyComponent doesn't get RefreshControl reliably on web;
        // keeping this branch separate makes the empty state crisp.
      >
        <InboxEmpty />
      </YStack>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      ListFooterComponent={
        isFetchingNextPage ? (
          <YStack paddingVertical="$4" alignItems="center" gap="$2">
            <Spinner />
            <Text fontSize="$2" color="$gray10">
              {t("notifications.inbox.loadingMore")}
            </Text>
          </YStack>
        ) : null
      }
    />
  );
}
