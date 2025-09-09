import { useQuery } from "@tanstack/react-query";

// Hook to fetch all locations
export function useGetLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const response = await fetch("/api/locations");
      if (!response.ok) {
        throw new Error("Failed to fetch locations");
      }
      return response.json();
    },
  });
}
