import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateCourtData, UpdateCourtData } from "@/lib/domain/types";

// Hook to fetch all courts
export function useGetCourts() {
  return useQuery({
    queryKey: ["courts"],
    queryFn: async () => {
      const response = await fetch("/api/courts");
      if (!response.ok) {
        throw new Error("Failed to fetch courts");
      }
      return response.json();
    },
  });
}

// Hook to fetch courts by location ID
export function useGetCourtsByLocationId(locationId: string | undefined) {
  return useQuery({
    queryKey: ["courts", "location", locationId],
    queryFn: async () => {
      if (!locationId) return { courts: [] };

      const response = await fetch(`/api/courts?locationId=${locationId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch courts for location");
      }
      return response.json();
    },
    enabled: !!locationId,
  });
}

// Hook to fetch active courts by location ID
export function useGetActiveCourtsByLocationId(locationId: string | undefined) {
  return useQuery({
    queryKey: ["courts", "location", locationId, "active"],
    queryFn: async () => {
      if (!locationId) return { courts: [] };

      const response = await fetch(
        `/api/courts?locationId=${locationId}&activeOnly=true`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch active courts for location");
      }
      return response.json();
    },
    enabled: !!locationId,
  });
}

// Hook to fetch a single court by ID
export function useGetCourt(
  courtId: string | undefined,
  includeLocation = false,
) {
  return useQuery({
    queryKey: ["courts", courtId, includeLocation ? "with-location" : "basic"],
    queryFn: async () => {
      if (!courtId) return null;

      const url = includeLocation
        ? `/api/courts/${courtId}?includeLocation=true`
        : `/api/courts/${courtId}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch court");
      }
      return response.json();
    },
    enabled: !!courtId,
  });
}

// Hook to create a new court
export function useCreateCourt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courtData: CreateCourtData) => {
      const response = await fetch("/api/courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(courtData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create court");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch courts queries
      queryClient.invalidateQueries({ queryKey: ["courts"] });
    },
  });
}

// Hook to update a court
export function useUpdateCourt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courtId,
      updates,
    }: {
      courtId: string;
      updates: UpdateCourtData;
    }) => {
      const response = await fetch(`/api/courts/${courtId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update court");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch courts queries
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      queryClient.invalidateQueries({
        queryKey: ["courts", variables.courtId],
      });
    },
  });
}

// Hook to delete a court
export function useDeleteCourt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courtId: string) => {
      const response = await fetch(`/api/courts/${courtId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete court");
      }

      return response.json();
    },
    onSuccess: (data, courtId) => {
      // Invalidate and refetch courts queries
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      queryClient.removeQueries({ queryKey: ["courts", courtId] });
    },
  });
}
