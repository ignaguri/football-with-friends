import { hc } from "hono/client";
import type { ApiRoutes } from "../../../apps/api/src/index";

// Get API URL from environment
const getApiUrl = () => {
  // For Expo (mobile)
  if (typeof process !== "undefined" && process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // For Next.js (web)
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Default to localhost
  return "http://localhost:3001";
};

const API_URL = getApiUrl();

// Create the Hono RPC client with full type safety
export const client = hc<ApiRoutes>(API_URL, {
  fetch: (input, init) => {
    return fetch(input, {
      ...init,
      credentials: "include", // Important for sending cookies
    });
  },
});

// Export the client as 'api' for convenience
export const api = client;
