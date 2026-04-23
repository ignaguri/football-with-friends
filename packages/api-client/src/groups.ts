// React Query hooks for the group management API.
//
// Pairs with `packages/api-client/src/group-storage.ts` (persistence for the
// active group id) and with the Phase 1 `X-Group-Id` fetch interceptor in
// `client.ts` (which carries the active group on every request).

import type {
  GroupInviteInvalidReason,
  GroupVisibility,
  MemberRole,
} from "@repo/shared/domain";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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

// The fetch wrapper in `client.ts` already throws on non-OK responses with
// structured `{response, data, status}` metadata, so mutations here don't
// re-check `res.ok` — it'd be dead code and would double-consume the body.

// Query-key namespace. Use these — don't inline strings — so cache
// invalidation stays consistent when we add more hooks in Phase 3.
export const groupQueryKeys = {
  all: ["groups"] as const,
  me: () => [...groupQueryKeys.all, "me"] as const,
  detail: (id: string) => [...groupQueryKeys.all, "detail", id] as const,
  members: (id: string) => [...groupQueryKeys.all, "members", id] as const,
  invites: (id: string) => [...groupQueryKeys.all, "invites", id] as const,
  invitePreview: (token: string) =>
    [...groupQueryKeys.all, "invite-preview", token] as const,
};

export interface MyGroupSummary {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  visibility: GroupVisibility;
  myRole: MemberRole;
  amIOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fetchMyGroups(): Promise<MyGroupSummary[]> {
  const res = await client.api.groups.me.$get();
  const data = (await res.json()) as { groups: MyGroupSummary[] };
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
 *
 * Implementation note: `getActiveGroupId()` is read non-reactively, but
 * `switchGroup` calls `queryClient.invalidateQueries()` which refetches
 * `useMyGroups`; the resulting data change re-runs this hook and picks up
 * the new active id. Future refactors should preserve that coupling.
 */
export function useCurrentGroup() {
  const queryClient = useQueryClient();
  const { data: myGroups, isLoading } = useMyGroups();
  const activeId = getActiveGroupId();
  const current = myGroups?.find((g) => g.id === activeId) ?? myGroups?.[0];

  // Self-heal persisted id: if the stored id points to a group the user no
  // longer belongs to, the fetch interceptor keeps echoing the stale id and
  // every scoped call 403s until the user manually switches. When we fall
  // back to myGroups[0], persist that correction so future requests use it.
  useEffect(() => {
    if (!current) return;
    if (activeId && activeId !== current.id) {
      setActiveGroupId(current.id);
    }
  }, [activeId, current?.id]);

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
      visibility?: GroupVisibility;
    }) => {
      const res = await client.api.groups[":id"].$patch({
        param: { id: groupId },
        json: input,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.me() });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const res = await client.api.groups[":id"].$delete({
        param: { id: groupId },
      });
      return res.json();
    },
    onSuccess: (_, groupId) => {
      // If the caller just deleted their own active group, drop the stored
      // id so the next scoped request lets the server auto-pick a remaining
      // membership (same path we take on FORBIDDEN_GROUP in the fetch
      // interceptor). Invalidate everything: queries carry X-Group-Id via
      // the interceptor, not in the key, so no scoped filter would match.
      if (getActiveGroupId() === groupId) {
        setActiveGroupId(null);
      }
      queryClient.invalidateQueries();
    },
  });
}

export function useUpdateMemberRole(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; role: MemberRole }) => {
      const res = await client.api.groups[":id"].members[":userId"].$patch({
        param: { id: groupId, userId: input.userId },
        json: { role: input.role },
      });
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.me() });
    },
  });
}

// --- Invites -------------------------------------------------------------

export interface GroupInviteSummary {
  id: string;
  groupId: string;
  token: string;
  createdByUserId: string;
  expiresAt?: string;
  maxUses?: number;
  usesCount: number;
  targetPhone?: string;
  targetUserId?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface GroupInvitePreviewResult {
  valid: boolean;
  reason?: GroupInviteInvalidReason;
  group?: { id: string; name: string };
  inviter?: { id: string; name: string };
  expiresAt?: string;
}

export function useGroupInvites(groupId: string | null) {
  return useQuery({
    queryKey: groupQueryKeys.invites(groupId ?? ""),
    enabled: !!groupId,
    queryFn: async () => {
      const res = await client.api.groups[":id"].invites.$get({
        param: { id: groupId! },
      });
      const data = (await res.json()) as { invites: GroupInviteSummary[] };
      return data.invites;
    },
  });
}

export function useCreateInvite(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      expiresInHours?: number;
      maxUses?: number;
      targetPhone?: string;
      targetUserId?: string;
    }) => {
      const res = await client.api.groups[":id"].invites.$post({
        param: { id: groupId },
        json: input,
      });
      const data = (await res.json()) as { invite: GroupInviteSummary };
      return data.invite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.invites(groupId) });
    },
  });
}

export function useRevokeInvite(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await client.api.groups[":id"].invites[":inviteId"].$delete({
        param: { id: groupId, inviteId },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.invites(groupId) });
    },
  });
}

// Preview is unauthenticated — still fine to reuse the same fetch interceptor
// (it attaches Authorization only when a token exists, so anonymous calls work).
export function useInvitePreview(token: string | null) {
  return useQuery({
    queryKey: groupQueryKeys.invitePreview(token ?? ""),
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      const res = await client.api.invites[":token"].$get({
        param: { token: token! },
      });
      const data = (await res.json()) as GroupInvitePreviewResult;
      return data;
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await client.api.invites[":token"].accept.$post({
        param: { token },
      });
      return (await res.json()) as {
        joined: true;
        groupId: string;
        claimedRosterId?: string;
        ambiguousRosterMatches?: number;
      };
    },
    onSuccess: (result) => {
      // Freshly joined → we have a new group. Switch to it and blow away any
      // previously cached scoped data so the new group's responses drive UI.
      setActiveGroupId(result.groupId);
      queryClient.invalidateQueries();
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.me() });
    },
  });
}
