import { hc } from "hono/client";
import type { ApiRoutes } from "../../../apps/api/src/index";

// Base URL for localhost development
const LOCALHOST_API = "http://localhost:3001";

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

    // Use try-catch to safely check for browser environment at runtime
    // This prevents bundler optimization from removing the check
    try {
      // Access globalThis.window to check if we're in a browser
      const win = globalThis.window;
      if (win && win.location && win.location.hostname) {
        const hostname = win.location.hostname;
        // If not on localhost, use same-origin /api
        if (hostname !== "localhost" && hostname !== "127.0.0.1") {
          apiBase = win.location.origin + "/api";
        }
      }
    } catch {
      // Not in browser, use default
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
