// React Query hooks for the match organizer API.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client as _client } from "./client";

// The Hono RPC client's generic type is too deep for TypeScript to resolve
// cleanly in this cross-package import. We fall back to a looser typing here;
// same pattern as groups.ts.
const client = _client as any;

// The fetch wrapper in `client.ts` already throws on non-OK responses, so
// mutations here don't re-check `res.ok` — it'd be dead code.

// Query-key namespace for matches.
export const matchQueryKeys = {
  all: ["matches"] as const,
  detail: (id: string) => ["matches", "detail", id] as const,
};

export function useAssignMatchOrganizer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string; userId: string }) => {
      const res = await client.api.matches[":id"].organizer.$post({
        param: { id: input.matchId },
        json: { userId: input.userId },
      });
      return res.json();
    },
    onSuccess: (_d: unknown, input: { matchId: string; userId: string }) => {
      queryClient.invalidateQueries({ queryKey: matchQueryKeys.detail(input.matchId) });
      queryClient.invalidateQueries({ queryKey: matchQueryKeys.all });
    },
  });
}

export function useClearMatchOrganizer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string) => {
      const res = await client.api.matches[":id"].organizer.$delete({
        param: { id: matchId },
      });
      return res.json();
    },
    onSuccess: (_d: unknown, matchId: string) => {
      queryClient.invalidateQueries({ queryKey: matchQueryKeys.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: matchQueryKeys.all });
    },
  });
}

/**
 * Whether the current user can manage this match: a group organizer / platform
 * admin, or the match's assigned per-match organizer.
 */
export function canManageMatch(params: {
  match: { organizerUserId?: string | null };
  currentUserId?: string;
  isGroupOrganizer: boolean;
  isPlatformAdmin: boolean;
}): boolean {
  if (params.isGroupOrganizer || params.isPlatformAdmin) return true;
  return (
    !!params.match.organizerUserId &&
    !!params.currentUserId &&
    params.match.organizerUserId === params.currentUserId
  );
}
