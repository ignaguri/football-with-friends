import type {
  NotificationPreferences,
  NotificationPreferencesUpdate,
} from "@repo/shared/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "./auth";
import { client as _client } from "./client";

// Same untyped escape hatch as groups.ts — Hono RPC's deep generics resolve
// as `unknown` across this package boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = _client as any;

export type { NotificationPreferences, NotificationPreferencesUpdate };

export const notificationPreferencesQueryKeys = {
  all: ["notification-preferences"] as const,
  me: () => [...notificationPreferencesQueryKeys.all, "me"] as const,
};

export function useNotificationPreferences() {
  const { data: session } = useSession();
  return useQuery<NotificationPreferences>({
    queryKey: notificationPreferencesQueryKeys.me(),
    enabled: !!session?.user,
    queryFn: async () => {
      const res = await client.api["notification-preferences"].$get();
      return (await res.json()) as NotificationPreferences;
    },
  });
}

interface MutationContext {
  previous?: NotificationPreferences;
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation<
    NotificationPreferences,
    Error,
    NotificationPreferencesUpdate,
    MutationContext
  >({
    mutationFn: async (update) => {
      const res = await client.api["notification-preferences"].$patch({
        json: update,
      });
      return (await res.json()) as NotificationPreferences;
    },
    onMutate: async (update) => {
      await queryClient.cancelQueries({
        queryKey: notificationPreferencesQueryKeys.me(),
      });
      const previous = queryClient.getQueryData<NotificationPreferences>(
        notificationPreferencesQueryKeys.me(),
      );
      if (previous) {
        queryClient.setQueryData<NotificationPreferences>(
          notificationPreferencesQueryKeys.me(),
          { ...previous, ...update },
        );
      }
      return { previous };
    },
    onError: (_err, _update, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(
          notificationPreferencesQueryKeys.me(),
          ctx.previous,
        );
      }
    },
    onSuccess: (data) => {
      // Server response is the canonical row; replace the cache directly so
      // we don't trigger an extra refetch.
      queryClient.setQueryData(notificationPreferencesQueryKeys.me(), data);
    },
  });
}
