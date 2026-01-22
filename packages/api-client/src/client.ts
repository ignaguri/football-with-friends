import { hc } from "hono/client";
import type { ApiRoutes } from "../../../apps/api/src/index";

// Base URL used for type generation - will be replaced at fetch time
const BASE_URL = "http://localhost:3001";

// Get API URL dynamically at fetch time (not at module load time)
function getApiUrl(): string {
  // Check if running in browser (must be checked at actual runtime)
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    // If NOT on localhost, use same-origin /api (works for all Vercel deployments)
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${window.location.origin}/api`;
    }
  }

  // For React Native/Expo mobile - use env var if available
  if (typeof process !== "undefined" && process.env.EXPO_PUBLIC_API_URL) {
    const url = process.env.EXPO_PUBLIC_API_URL;
    // Skip if it's a template variable that wasn't substituted
    if (!url.includes("${") && url !== "http://localhost:3001") {
      return url;
    }
  }

  // Default to localhost for development
  return BASE_URL;
}

// Create the Hono RPC client with dynamic URL resolution in fetch wrapper
export const client = hc<ApiRoutes>(BASE_URL, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    // Resolve the actual API URL at fetch time, not module load time
    const apiUrl = getApiUrl();

    // Replace base URL with actual URL in the request
    let finalUrl: string;
    if (typeof input === "string") {
      finalUrl = input.replace(BASE_URL, apiUrl);
    } else if (input instanceof URL) {
      finalUrl = input.toString().replace(BASE_URL, apiUrl);
    } else {
      // Request object - create new request with updated URL
      finalUrl = input.url.replace(BASE_URL, apiUrl);
      return fetch(new Request(finalUrl, input), {
        ...init,
        credentials: "include",
      });
    }

    return fetch(finalUrl, {
      ...init,
      credentials: "include", // Important for sending cookies
    });
  },
});

// Export the client as 'api' for convenience
export const api = client;
