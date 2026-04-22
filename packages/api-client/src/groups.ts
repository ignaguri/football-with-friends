// React Query hooks for the group management API.
//
// Pairs with `packages/api-client/src/group-storage.ts` (persistence for the
// active group id) and with the Phase 1 `X-Group-Id` fetch interceptor in
// `client.ts` (which carries the active group on every request).

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client as _client } from "./client";
import {
  getActiveGroupId,
  setActiveGroupId,
} from "./group-storage";

// The Hono RPC client's generic type is too deep for TypeScript to resolve
// cleanly in this cross-package import (it types as `unknown`). We fall back
// to a looser typing here; mobile-web's existing `client.api.*` usage has the
// same behavior at runtime (and mobile-web skips typecheck for Tamagui-unrelated
// reasons).
const client = _client as any;

// Query-key namespace. Use these — don't inline strings — so cache
// invalidation stays consistent when we add more hooks in Phase 3.
export const groupQueryKeys = {
  all: ["groups"] as const,
  me: () => [...groupQueryKeys.all, "me"] as const,
  detail: (id: string) => [...groupQueryKeys.all, "detail", id] as const,
  members: (id: string) => [...groupQueryKeys.all, "members", id] as const,
};

async function fetchMyGroups() {
  const res = await client.api.groups.me.$get();
  const data = (await res.json()) as {
    groups: Array<{
      id: string;
      name: string;
      slug: string;
      ownerUserId: string;
      visibility: "private" | "public";
      myRole: "organizer" | "member";
      amIOwner: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  return data.groups;
}

export function useMyGroups() {
  return useQuery({
    queryKey: groupQueryKeys.me(),
    queryFn: fetchMyGroups,
  });
}

/**
 * One-stop hook for switcher / tab-gate callers. Exposes the persisted
 * active group id (server may have auto-picked on boot — see the fetch
 * interceptor) and the list of my groups. `noGroup` is true once the
 * list has loaded and is empty.
 */
export function useCurrentGroup() {
  const queryClient = useQueryClient();
  const { data: myGroups, isLoading } = useMyGroups();
  const activeId = getActiveGroupId();
  const current = myGroups?.find((g) => g.id === activeId) ?? myGroups?.[0];

  function switchGroup(id: string) {
    setActiveGroupId(id);
    // All queries carry X-Group-Id implicitly via the fetch interceptor, so
    // anything currently cached is for the OLD group. Blow it away.
    queryClient.invalidateQueries();
  }

  return {
    groupId: current?.id ?? null,
    group: current,
    myRole: current?.myRole,
    amIOwner: current?.amIOwner ?? false,
    myGroups: myGroups ?? [],
    isLoading,
    noGroup: !isLoading && (myGroups?.length ?? 0) === 0,
    switchGroup,
  };
}

export function useGroupDetail(groupId: string | null) {
  return useQuery({
    queryKey: groupQueryKeys.detail(groupId ?? ""),
    enabled: !!groupId,
    queryFn: async () => {
      const res = await client.api.groups[":id"].$get({ param: { id: groupId! } });
      const data = (await res.json()) as { group: unknown };
      return data.group;
    },
  });
}

export function useGroupMembers(groupId: string | null) {
  return useQuery({
    queryKey: groupQueryKeys.members(groupId ?? ""),
    enabled: !!groupId,
    queryFn: async () => {
      const res = await client.api.groups[":id"].members.$get({
        param: { id: groupId! },
      });
      const data = (await res.json()) as { members: unknown[] };
      return data.members;
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; slug?: string }) => {
      const res = await client.api.groups.$post({ json: input });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        group: { id: string; name: string; slug: string };
      };
      return data.group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.me() });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name?: string;
      slug?: string;
      visibility?: "private" | "public";
    }) => {
      const res = await client.api.groups[":id"].$patch({
        param: { id: groupId },
        json: input,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.me() });
    },
  });
}

export function useUpdateMemberRole(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; role: "organizer" | "member" }) => {
      const res = await client.api.groups[":id"].members[":userId"].$patch({
        param: { id: groupId, userId: input.userId },
        json: { role: input.role },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.members(groupId) });
    },
  });
}

export function useKickMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await client.api.groups[":id"].members[":userId"].$delete({
        param: { id: groupId, userId },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.members(groupId) });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const res = await client.api.groups[":id"].leave.$post({
        param: { id: groupId },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.me() });
    },
  });
}

export function useTransferOwnership(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (toUserId: string) => {
      const res = await client.api.groups[":id"]["transfer-ownership"].$post({
        param: { id: groupId },
        json: { toUserId },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.me() });
    },
  });
}
