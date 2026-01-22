// Auth client for Expo/React Native
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

// Base URL for localhost development (will be replaced at runtime for deployed environments)
const LOCALHOST_API = "http://localhost:3001";

// Get API URL dynamically at runtime
function getApiUrl(): string {
  // Use try-catch to safely check for browser environment at runtime
  // This prevents bundler optimization from removing the check
  try {
    const win = globalThis.window;
    if (win && win.location && win.location.hostname) {
      const hostname = win.location.hostname;
      // If not on localhost, use same-origin (works for all Vercel deployments)
      if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        return win.location.origin;
      }
    }
  } catch {
    // Not in browser, use default
  }

  // For React Native mobile - check env var
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) {
    const url = process.env.EXPO_PUBLIC_API_URL;
    if (!url.includes("${") && url !== LOCALHOST_API) {
      return url;
    }
  }

  return LOCALHOST_API;
}

// Custom fetch that resolves URL at request time
function createDynamicFetch(): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    let originalUrl: string;
    if (typeof input === "string") {
      originalUrl = input;
    } else if (input instanceof URL) {
      originalUrl = input.toString();
    } else {
      originalUrl = input.url;
    }

    const apiBase = getApiUrl();
    const finalUrl = originalUrl.replace(LOCALHOST_API, apiBase);

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

// Create the Better Auth client with Expo plugin for React Native
// Use localhost as base URL but override with custom fetch for dynamic resolution
export const authClient = createAuthClient({
  baseURL: LOCALHOST_API,
  fetchOptions: {
    customFetchImpl: createDynamicFetch(),
  },
  plugins: [
    usernameClient(),
    expoClient({
      scheme: "football-with-friends", // Deep link scheme from app.json
      storagePrefix: "football_auth",
      storage: SecureStore,
    }),
  ],
});

// Export individual auth methods for convenience
export const {
  signUp,
  signIn,
  signOut,
  useSession,
  getSession,
  $Infer,
} = authClient;

// Export types
export type Session = typeof authClient.$Infer.Session;
export type User = Session["user"];
