import { hc } from "hono/client";
import type { ApiRoutes } from "../../../apps/api/src/index";

// Get API URL from environment
const getApiUrl = () => {
  // Check if running in browser on Vercel deployment
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // If on Vercel deployment (not localhost), use same-origin /api
    if (hostname.includes("vercel.app") || hostname.includes(".vercel.")) {
      return `${window.location.origin}/api`;
    }
  }

  // For Expo (mobile) - use env var if set and not localhost placeholder
  if (typeof process !== "undefined" && process.env.EXPO_PUBLIC_API_URL) {
    const url = process.env.EXPO_PUBLIC_API_URL;
    // Skip if it's a template variable that wasn't substituted
    if (!url.includes("${") && url !== "http://localhost:3001") {
      return url;
    }
  }

  // For Next.js (web)
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Default to localhost for development
  return "http://localhost:3001";
};

const API_URL = getApiUrl();

// Create the Hono RPC client with full type safety
export const client = hc<ApiRoutes>(API_URL, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: "include", // Important for sending cookies
    });
  },
});

// Export the client as 'api' for convenience
export const api = client;
