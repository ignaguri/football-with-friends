import { hc } from "hono/client";
import type { ApiRoutes } from "../../../apps/api/src/index";

// Base URL for localhost development
const LOCALHOST_API = "http://localhost:3001";

// Configured API URL (set via configureGeneralApiClient)
let _configuredApiUrl: string | null = null;

/**
 * Configure the general API client with the API URL.
 * Call this early in your app initialization (e.g., in _layout.tsx).
 * For Expo apps, pass process.env.EXPO_PUBLIC_API_URL.
 */
export function configureGeneralApiClient(apiUrl: string | undefined) {
  if (apiUrl && apiUrl.length > 0 && !apiUrl.includes("${")) {
    _configuredApiUrl = apiUrl.trim();
  }
}

// Custom fetch that dynamically resolves API URL at request time
// This ensures the URL is computed when the request is made, not at bundle time
function createDynamicFetch() {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Get the original URL from the input
    let originalUrl: string;
    if (typeof input === "string") {
      originalUrl = input;
    } else if (input instanceof URL) {
      originalUrl = input.toString();
    } else {
      originalUrl = input.url;
    }

    // Determine the correct API base URL at runtime
    let apiBase = LOCALHOST_API;

    // First, check if configured via configureGeneralApiClient
    if (_configuredApiUrl) {
      apiBase = _configuredApiUrl;
    } else if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) {
      // Fallback: check process.env
      const url = process.env.EXPO_PUBLIC_API_URL;
      if (!url.includes("${") && url.length > 0) {
        apiBase = url;
      }
    }

    // Replace localhost URL with the correct API base
    const finalUrl = originalUrl.replace(LOCALHOST_API, apiBase);

    // Handle Request objects specially
    if (typeof input !== "string" && !(input instanceof URL)) {
      return fetch(new Request(finalUrl, input), {
        ...init,
        credentials: "include",
      });
    }

    return fetch(finalUrl, {
      ...init,
      credentials: "include",
    });
  };
}

// Create the Hono RPC client with dynamic URL resolution
export const client = hc<ApiRoutes>(LOCALHOST_API, {
  fetch: createDynamicFetch(),
});

// Export the client as 'api' for convenience
export const api = client;
