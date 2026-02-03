// Auth client for Expo/React Native
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Storage adapter that works on both web (AsyncStorage) and native (SecureStore)
// SecureStore doesn't work on web, so we need to use AsyncStorage there
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

// Bearer token management (web only - native uses expo plugin with SecureStore)
const BEARER_TOKEN_KEY = "football_auth_bearer_token";
let _cachedBearerToken: string | undefined;

// Load cached bearer token on module init (web only)
if (Platform.OS === "web") {
  AsyncStorage.getItem(BEARER_TOKEN_KEY).then((token) => {
    if (token) _cachedBearerToken = token;
  });
}

/**
 * Store a bearer token for web authentication.
 * Used after OAuth callback to persist the session token.
 */
export async function storeBearerToken(token: string) {
  _cachedBearerToken = token;
  await AsyncStorage.setItem(BEARER_TOKEN_KEY, token);
}

/**
 * Clear the bearer token (used on sign-out).
 */
export async function clearBearerToken() {
  _cachedBearerToken = undefined;
  await AsyncStorage.removeItem(BEARER_TOKEN_KEY);
}

/**
 * Get the current bearer token (used by general API client for authenticated requests).
 */
export function getBearerToken(): string | undefined {
  return _cachedBearerToken;
}

// Base URL for localhost development (will be replaced at runtime for deployed environments)
const LOCALHOST_API = "http://localhost:3001";

// Configured API URL (set via configureApiClient)
let _configuredApiUrl: string | null = null;

/**
 * Configure the API client with the API URL.
 * Call this early in your app initialization (e.g., in _layout.tsx).
 * For Expo apps, pass process.env.EXPO_PUBLIC_API_URL.
 */
export function configureApiClient(apiUrl: string | undefined) {
  if (apiUrl && apiUrl.length > 0 && !apiUrl.includes("${")) {
    _configuredApiUrl = apiUrl.trim();
  }
}

// Get API URL dynamically at runtime
function getApiUrl(): string {
  // First, check if configured via configureApiClient
  if (_configuredApiUrl) {
    return _configuredApiUrl;
  }

  // Fallback: check process.env (for React Native or if babel-inline-env works)
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) {
    const url = process.env.EXPO_PUBLIC_API_URL;
    if (!url.includes("${") && url.length > 0) {
      return url;
    }
  }

  // For local development, use localhost
  return LOCALHOST_API;
}

/**
 * Get the configured API URL for use in direct fetch calls.
 * This is useful when you need to bypass the expo plugin (e.g., OAuth on web).
 */
export function getConfiguredApiUrl(): string {
  return getApiUrl();
}

// Custom fetch that resolves URL at request time
// On web: injects Bearer token and captures set-auth-token response header
// Note: Type assertion needed because fetch type includes preconnect which we don't need
function createDynamicFetch() {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
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

    const fetchInit: RequestInit = { ...init, credentials: "include" };

    // Web: inject Bearer token header for cross-domain auth
    // Also omit cookies — stale better-auth cookies (e.g. state) interfere with the bearer plugin
    if (Platform.OS === "web" && _cachedBearerToken) {
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${_cachedBearerToken}`);
      fetchInit.headers = headers;
      fetchInit.credentials = "omit";
    }

    let responsePromise: Promise<Response>;

    if (typeof input !== "string" && !(input instanceof URL)) {
      responsePromise = fetch(new Request(finalUrl, input), fetchInit);
    } else {
      responsePromise = fetch(finalUrl, fetchInit);
    }

    // Web: capture set-auth-token from responses and clear token on sign-out
    if (Platform.OS === "web") {
      return responsePromise.then((response) => {
        const newToken = response.headers.get("set-auth-token");
        if (newToken) {
          _cachedBearerToken = newToken;
          AsyncStorage.setItem(BEARER_TOKEN_KEY, newToken).catch(console.error);
        }
        // Clear token when signing out
        if (finalUrl.includes("/sign-out")) {
          _cachedBearerToken = undefined;
          AsyncStorage.removeItem(BEARER_TOKEN_KEY).catch(console.error);
        }
        return response;
      });
    }

    return responsePromise;
  }) as typeof fetch;
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
      // Type assertion needed due to mismatch between async storage and expected sync type
      storage: storage as any,
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

// Phone authentication helpers
export interface PhoneSignUpData {
  phoneNumber: string;
  password: string;
  name: string;
}

export interface PhoneSignInData {
  phoneNumber: string;
  password: string;
}

/**
 * Sign up with phone number and password.
 * Phone is stored for admin contact purposes (e.g., WhatsApp).
 */
export async function signUpWithPhone(data: PhoneSignUpData) {
  const response = await fetch(`${getApiUrl()}/api/phone-auth/sign-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to sign up");
  }

  // On web, store the bearer token if returned
  if (Platform.OS === "web" && result.session?.token) {
    await storeBearerToken(result.session.token);
  }

  return result;
}

/**
 * Sign in with phone number and password.
 */
export async function signInWithPhone(data: PhoneSignInData) {
  const response = await fetch(`${getApiUrl()}/api/phone-auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Invalid phone number or password");
  }

  // On web, store the bearer token if returned
  if (Platform.OS === "web" && result.session?.token) {
    await storeBearerToken(result.session.token);
  }

  return result;
}

/**
 * Check if a phone number is available for registration.
 */
export async function checkPhoneAvailability(phoneNumber: string): Promise<boolean> {
  const response = await fetch(
    `${getApiUrl()}/api/phone-auth/check-phone?phoneNumber=${encodeURIComponent(phoneNumber)}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    return false;
  }

  const result = await response.json();
  return result.available ?? false;
}

// Export types
export type Session = typeof authClient.$Infer.Session;
export type User = Session["user"];
