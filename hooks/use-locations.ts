import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Types
export interface LocationResponse {
  locations: Array<{
    id: string;
    name: string;
    address?: string;
    coordinates?: string;
    courtCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface CreateLocationData {
  name: string;
  address?: string;
  coordinates?: string;
  courtCount?: number;
}

export interface UpdateLocationData {
  name?: string;
  address?: string;
  coordinates?: string;
  courtCount?: number;
}

// API Functions
async function fetchLocations(): Promise<LocationResponse> {
  const response = await fetch("/api/locations");
  if (!response.ok) {
    throw new Error("Failed to fetch locations");
  }
  return response.json();
}

async function fetchLocation(locationId: string) {
  const response = await fetch(`/api/locations/${locationId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch location");
  }
  return response.json();
}

async function createLocation(locationData: CreateLocationData) {
  const response = await fetch("/api/locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(locationData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create location");
  }
  return response.json();
}

async function updateLocation({
  locationId,
  updates,
}: {
  locationId: string;
  updates: UpdateLocationData;
}) {
  const response = await fetch(`/api/locations/${locationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update location");
  }
  return response.json();
}

async function deleteLocation(locationId: string) {
  const response = await fetch(`/api/locations/${locationId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete location");
  }
  return response.json();
}

// Hooks
export function useGetLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations,
  });
}

export function useGetLocation(locationId: string) {
  return useQuery({
    queryKey: ["location", locationId],
    queryFn: () => fetchLocation(locationId),
    enabled: !!locationId,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["courts"] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["courts"] });
    },
  });
}
