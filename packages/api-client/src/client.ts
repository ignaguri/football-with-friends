import { hc } from "hono/client";
import { Platform } from "react-native";
import type { ApiRoutes } from "../../../apps/api/src/index";
import { getBearerToken, _tokenLoadPromise } from "./auth";
import {
  GROUP_HEADER,
  _groupIdLoadPromise,
  getActiveGroupId,
  recordGroupIdFromResponse,
} from "./group-storage";

// Base URL for localhost development
const LOCALHOST_API = "http://localhost:3001";

// Configured API URL (set via configureGeneralApiClient)
let _configuredApiUrl: string | null = null;

// Configured language for Accept-Language header (default matches i18n fallbackLng)
let _language: string = "es";

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

/**
 * Configure the language for API requests.
 * Sets the Accept-Language header on all outgoing requests.
 */
export function configureLanguage(lang: string) {
  _language = lang;
}

// Custom fetch that dynamically resolves API URL at request time
// This ensures the URL is computed when the request is made, not at bundle time
function createDynamicFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Wait for the initial token load to complete before making any request.
    // Prevents a race where data queries fire before the token is loaded from SecureStore.
    await _tokenLoadPromise;
    // Same race applies to the persisted active group id.
    await _groupIdLoadPromise;

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

    const fetchInit: RequestInit = { ...init, credentials: "include" };

    // Set Accept-Language header for localized API responses
    {
      const headers = new Headers(fetchInit.headers);
      headers.set("Accept-Language", _language);
      fetchInit.headers = headers;
    }

    // Inject Bearer token for authenticated API requests (all platforms).
    // Native has no cookies; web uses cross-origin (Vercel → Cloudflare Workers)
    // where cookies aren't available either — so Bearer auth is used everywhere.
    {
      const token = getBearerToken();
      if (token) {
        const headers = new Headers(fetchInit.headers);
        headers.set("Authorization", `Bearer ${token}`);
        fetchInit.headers = headers;
        fetchInit.credentials = "omit";
      }
    }

    // Attach the active group id so the server scopes the response to it.
    // On first launch we have no persisted id — the server auto-picks and
    // echoes one back in the response, which we persist via the handler below.
    {
      const groupId = getActiveGroupId();
      if (groupId) {
        const headers = new Headers(fetchInit.headers);
        headers.set(GROUP_HEADER, groupId);
        fetchInit.headers = headers;
      }
    }

    // Handle Request objects specially
    let responsePromise: Promise<Response>;
    if (typeof input !== "string" && !(input instanceof URL)) {
      responsePromise = fetch(new Request(finalUrl, input), fetchInit);
    } else {
      responsePromise = fetch(finalUrl, fetchInit);
    }

    // Throw on non-OK responses so React Query treats them as errors
    // instead of passing error payloads as successful data
    return responsePromise.then(async (response) => {
      // Sync active-group cache with the server's echoed header so the
      // auto-picked group on first boot (or after a switch) persists.
      recordGroupIdFromResponse(response);
      if (!response.ok) {
        // Clone the response so we can read the body without consuming it
        const clonedResponse = response.clone();
        let errorData: unknown = null;
        try {
          errorData = await clonedResponse.json();
        } catch {
          // Response body is not JSON, ignore
        }
        const error = new Error(`API error: ${response.status} ${response.statusText}`) as Error & {
          response: Response;
          data: unknown;
          status: number;
        };
        error.response = response;
        error.data = errorData;
        error.status = response.status;
        throw error;
      }
      return response;
    });
  };
}

// Create the Hono RPC client with dynamic URL resolution
export const client = hc<ApiRoutes>(LOCALHOST_API, {
  fetch: createDynamicFetch(),
});

// Export the client as 'api' for convenience
export const api = client;
