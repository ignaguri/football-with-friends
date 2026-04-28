import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import type { InboxNotification } from "@repo/shared/domain";

import { useSession } from "./auth";
import { client as _client } from "./client";
import { getActiveGroupId } from "./group-storage";

// Hono RPC's deep generics resolve as `unknown` across this package boundary.

const client = _client as any;

export type { InboxNotification };

export interface InboxPage {
  items: InboxNotification[];
  hasMore: boolean;
  nextCursor: string | null;
}

export const notificationInboxQueryKeys = {
  all: ["notifications-inbox"] as const,
  list: (groupId: string | null) =>
    [...notificationInboxQueryKeys.all, "list", groupId ?? "_none"] as const,
  unread: (groupId: string | null) =>
    [...notificationInboxQueryKeys.all, "unread", groupId ?? "_none"] as const,
};

export function useNotifications(opts: { limit?: number } = {}) {
  const { data: session } = useSession();
  const groupId = getActiveGroupId();
  const limit = opts.limit ?? 30;

  return useInfiniteQuery<InboxPage>({
    queryKey: notificationInboxQueryKeys.list(groupId),
    enabled: !!session?.user && !!groupId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    queryFn: async ({ pageParam }) => {
      const query: Record<string, string> = { limit: String(limit) };
      if (typeof pageParam === "string") query.before = pageParam;
      const res = await client.api.notifications.$get({ query });
      return (await res.json()) as InboxPage;
    },
  });
}

export function useUnreadNotificationCount() {
  const { data: session } = useSession();
  const groupId = getActiveGroupId();

  return useQuery<{ unreadCount: number }>({
    queryKey: notificationInboxQueryKeys.unread(groupId),
    enabled: !!session?.user && !!groupId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 60_000, // gentle background poll while the app is open
    queryFn: async () => {
      const res = await client.api.notifications["unread-count"].$get();
      return (await res.json()) as { unreadCount: number };
    },
  });
}

interface MarkReadContext {
  previousList?: InfiniteData<InboxPage>;
  previousUnread?: { unreadCount: number };
  groupId: string | null;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation<{ success: true }, Error, string, MarkReadContext>({
    mutationFn: async (id) => {
      const res = await client.api.notifications[":id"].read.$patch({
        param: { id },
      });
      return (await res.json()) as { success: true };
    },
    onMutate: async (id) => {
      const groupId = getActiveGroupId();
      const listKey = notificationInboxQueryKeys.list(groupId);
      const unreadKey = notificationInboxQueryKeys.unread(groupId);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: unreadKey }),
      ]);

      const previousList =
        queryClient.getQueryData<InfiniteData<InboxPage>>(listKey);
      const previousUnread = queryClient.getQueryData<{ unreadCount: number }>(
        unreadKey,
      );

      if (previousList) {
        let didFlip = false;
        const now = new Date().toISOString();
        const next: InfiniteData<InboxPage> = {
          ...previousList,
          pages: previousList.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id !== id || item.readAt) return item;
              didFlip = true;
              return { ...item, readAt: now };
            }),
          })),
        };
        if (didFlip) queryClient.setQueryData(listKey, next);
      }

      if (previousUnread && previousUnread.unreadCount > 0) {
        queryClient.setQueryData(unreadKey, {
          unreadCount: Math.max(0, previousUnread.unreadCount - 1),
        });
      }

      return { previousList, previousUnread, groupId };
    },
    onError: (_err, _id, ctx) => {
      if (!ctx) return;
      const listKey = notificationInboxQueryKeys.list(ctx.groupId);
      const unreadKey = notificationInboxQueryKeys.unread(ctx.groupId);
      if (ctx.previousList) queryClient.setQueryData(listKey, ctx.previousList);
      if (ctx.previousUnread)
        queryClient.setQueryData(unreadKey, ctx.previousUnread);
    },
    onSettled: (_data, _err, _id, ctx) => {
      if (!ctx) return;
      void queryClient.invalidateQueries({
        queryKey: notificationInboxQueryKeys.unread(ctx.groupId),
      });
    },
  });
}

interface MarkAllReadContext {
  previousList?: InfiniteData<InboxPage>;
  previousUnread?: { unreadCount: number };
  groupId: string | null;
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation<{ updated: number }, Error, void, MarkAllReadContext>({
    mutationFn: async () => {
      const res = await client.api.notifications["read-all"].$post();
      return (await res.json()) as { updated: number };
    },
    onMutate: async () => {
      const groupId = getActiveGroupId();
      const listKey = notificationInboxQueryKeys.list(groupId);
      const unreadKey = notificationInboxQueryKeys.unread(groupId);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: unreadKey }),
      ]);

      const previousList =
        queryClient.getQueryData<InfiniteData<InboxPage>>(listKey);
      const previousUnread = queryClient.getQueryData<{ unreadCount: number }>(
        unreadKey,
      );

      if (previousList) {
        const now = new Date().toISOString();
        const next: InfiniteData<InboxPage> = {
          ...previousList,
          pages: previousList.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.readAt ? item : { ...item, readAt: now },
            ),
          })),
        };
        queryClient.setQueryData(listKey, next);
      }

      queryClient.setQueryData(unreadKey, { unreadCount: 0 });

      return { previousList, previousUnread, groupId };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      const listKey = notificationInboxQueryKeys.list(ctx.groupId);
      const unreadKey = notificationInboxQueryKeys.unread(ctx.groupId);
      if (ctx.previousList) queryClient.setQueryData(listKey, ctx.previousList);
      if (ctx.previousUnread)
        queryClient.setQueryData(unreadKey, ctx.previousUnread);
    },
    onSettled: (_data, _err, _vars, ctx) => {
      if (!ctx) return;
      void queryClient.invalidateQueries({
        queryKey: notificationInboxQueryKeys.unread(ctx.groupId),
      });
    },
  });
}
