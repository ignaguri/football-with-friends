// Auth client for Expo/React Native
import { createAuthClient } from "better-auth/react";
import { usernameClient, phoneNumberClient } from "better-auth/client/plugins";
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

// Bearer token management (all platforms - uses SecureStore on native, AsyncStorage on web)
const BEARER_TOKEN_KEY = "football_auth_bearer_token";
let _cachedBearerToken: string | undefined;

// Promise that resolves when the initial bearer token load completes.
// The custom fetch awaits this before the first request to avoid a race condition
// where useSession() fires getSession() before the token is loaded from storage.
const _tokenLoadPromise: Promise<void> = storage
  .getItem(BEARER_TOKEN_KEY)
  .then((token) => {
    if (token) _cachedBearerToken = token;
  })
  .catch(() => {
    // Ignore storage errors on init
  });

/**
 * Store a bearer token for authentication.
 * Used after OAuth callback or sign-in to persist the session token.
 */
export async function storeBearerToken(token: string) {
  _cachedBearerToken = token;
  await storage.setItem(BEARER_TOKEN_KEY, token);
}

/**
 * Clear the bearer token (used on sign-out).
 */
export async function clearBearerToken() {
  _cachedBearerToken = undefined;
  await storage.deleteItem(BEARER_TOKEN_KEY);
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

// Google Client ID for One Tap (set via configureGoogleClientId)
let _googleClientId: string | null = null;

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

/**
 * Configure the Google Client ID for One Tap authentication (web only).
 * Call this early in your app initialization (e.g., in _layout.tsx).
 * For Expo apps, pass process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID.
 */
export function configureGoogleClientId(clientId: string | undefined) {
  if (clientId && clientId.length > 0 && !clientId.includes("${")) {
    _googleClientId = clientId.trim();
  }
}

/**
 * Get the configured Google Client ID.
 */
export function getGoogleClientId(): string | null {
  return _googleClientId;
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
// Injects Bearer token and captures set-auth-token response header (all platforms)
// Note: Type assertion needed because fetch type includes preconnect which we don't need
function createDynamicFetch() {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    // Wait for the initial token load to complete before making any request.
    // This prevents a race where getSession() fires before the token is loaded from storage.
    return _tokenLoadPromise.then(() => {
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

      // Inject Bearer token header for authenticated requests (all platforms)
      if (_cachedBearerToken) {
        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer ${_cachedBearerToken}`);
        fetchInit.headers = headers;
        // Omit cookies when using bearer token — stale session cookies interfere
        // with the bearer plugin (server checks cookies first, finds invalid session,
        // returns null before the bearer plugin gets a chance to run)
        fetchInit.credentials = "omit";
      }

      let responsePromise: Promise<Response>;

      if (typeof input !== "string" && !(input instanceof URL)) {
        responsePromise = fetch(new Request(finalUrl, input), fetchInit);
      } else {
        responsePromise = fetch(finalUrl, fetchInit);
      }

      // Capture set-auth-token from responses and clear token on sign-out (all platforms)
      return responsePromise.then((response) => {
        const newToken = response.headers.get("set-auth-token");
        if (newToken) {
          // The set-auth-token value is "token.hash" (URL-encoded). Store just the
          // token part (before the dot) — the bearer plugin accepts it without hash
          // verification, and avoids URL-encoding issues across platforms.
          const tokenPart = newToken.split(".")[0] || newToken;
          _cachedBearerToken = tokenPart;
          storage.setItem(BEARER_TOKEN_KEY, tokenPart).catch(console.error);
        }
        // Clear token when signing out
        if (finalUrl.includes("/sign-out")) {
          _cachedBearerToken = undefined;
          storage.deleteItem(BEARER_TOKEN_KEY).catch(console.error);
        }
        return response;
      });
    });
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
    phoneNumberClient(),
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
 * Creates user via custom endpoint, then establishes session via native phoneNumber.verify()
 */
export async function signUpWithPhone(data: PhoneSignUpData) {
  // Step 1: Create user with password (no session yet)
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

  // Step 2: Create session via native phoneNumber flow (password as OTP)
  // sendOtp is a no-op on server, but required by the flow
  await authClient.phoneNumber.sendOtp({ phoneNumber: data.phoneNumber });

  // verify() with password as code - server validates against stored hash
  const verifyResult = await authClient.phoneNumber.verify({
    phoneNumber: data.phoneNumber,
    code: data.password,
  });

  if (verifyResult.error) {
    throw new Error(verifyResult.error.message || "Failed to create session");
  }

  return verifyResult.data;
}

/**
 * Sign in with phone number and password.
 * Uses native phoneNumber.verify() for session management (fixes infinite polling)
 */
export async function signInWithPhone(data: PhoneSignInData) {
  // sendOtp is a no-op on server, but required by the flow
  await authClient.phoneNumber.sendOtp({ phoneNumber: data.phoneNumber });

  // verify() with password as code - server validates against stored hash
  const result = await authClient.phoneNumber.verify({
    phoneNumber: data.phoneNumber,
    code: data.password,
  });

  // verify() returns { status, token, user } on success
  if (result.error || !result.data?.token) {
    throw new Error("Invalid phone number or password");
  }

  return result.data;
}

// Export types
export type Session = typeof authClient.$Infer.Session;
export type User = Session["user"];
