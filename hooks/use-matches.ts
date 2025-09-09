import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  MatchDisplay,
  MatchDetailsDisplay,
} from "@/lib/mappers/display-mappers";

// --- Types ---

export type Player = Record<string, string>;

// Re-export display types for convenience
export type {
  MatchDetailsDisplay,
  MatchDisplay,
} from "@/lib/mappers/display-mappers";

export type MatchesResponse = {
  matches: MatchDisplay[];
};

export type MatchDetailsResponse = MatchDetailsDisplay;

// --- API Functions ---

async function fetchMatches(
  type?: "upcoming" | "past",
): Promise<MatchesResponse> {
  const url = type ? `/api/matches?type=${type}` : "/api/matches";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch matches");
  }
  return response.json();
}

async function fetchMatch(matchId: string): Promise<MatchDetailsResponse> {
  const response = await fetch(`/api/matches/${matchId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch match details");
  }
  return response.json();
}

// --- Hooks ---

export function useGetMatches(type?: "upcoming" | "past") {
  return useQuery({
    queryKey: ["matches", type || "all"],
    queryFn: () => fetchMatches(type),
  });
}

export function useGetMatch(matchId: string) {
  return useQuery({
    queryKey: ["match", matchId],
    queryFn: () => fetchMatch(matchId),
    enabled: !!matchId,
  });
}

// --- Mutation API Functions ---

async function addMatch(
  newMatch: Omit<MatchDisplay, "matchId" | "name">,
): Promise<MatchDisplay> {
  const response = await fetch("/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newMatch),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add match: ${errorText}`);
  }
  return response.json();
}

async function updateMatch({
  matchId,
  updates,
}: {
  matchId: string;
  updates: Partial<MatchDisplay>;
}): Promise<Response> {
  const response = await fetch(`/api/matches/${matchId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error("Failed to update match");
  }
  return response;
}

async function deleteMatch(matchId: string): Promise<Response> {
  const response = await fetch(`/api/matches/${matchId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete match");
  }
  return response;
}

type SignupPlayerData = {
  matchId: string;
  payload: {
    playerName?: string;
    playerEmail?: string;
    status: string;
    isGuest?: boolean;
    ownerName?: string;
    ownerEmail?: string;
    guestName?: string;
  };
};

async function signupPlayer({
  matchId,
  payload,
}: SignupPlayerData): Promise<Response> {
  const response = await fetch(`/api/matches/${matchId}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to sign up player");
  }
  return response;
}

// --- Mutation Hooks ---

export function useAddMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addMatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useUpdateMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMatch,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({
        queryKey: ["match", variables.matchId],
      });
    },
  });
}

export function useDeleteMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useSignupPlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signupPlayer,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["match", variables.matchId],
      });
    },
  });
}
