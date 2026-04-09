// Auth client for Expo/React Native
import { createAuthClient } from "better-auth/react";
import { usernameClient, phoneNumberClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Storage adapter that works on both web (AsyncStorage) and native (SecureStore).
// IMPORTANT: getItem and setItem MUST be synchronous on native because the
// expoClient plugin calls them without await (e.g. getCookie(storage.getItem(key))).
// Using async here causes getItem to return a Promise (truthy), which silently
// breaks cookie injection — getCookie(Promise) parses as empty object.
const storage = {
  getItem(key: string): string | null {
    if (Platform.OS === "web") {
      // expoClient skips cookie injection on web (has `if (isWeb) return` checks),
      // so this is only called for bearer token loading which handles async separately.
      return null;
    }
    return SecureStore.getItem(key);
  },
  setItem(key: string, value: string): void {
    if (Platform.OS === "web") {
      AsyncStorage.setItem(key, value);
      return;
    }
    SecureStore.setItem(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

const BEARER_TOKEN_KEY = "football_auth_bearer_token";
let _cachedBearerToken: string | undefined;

/**
 * Clear corrupted cookie data left by the old async storage adapter.
 * The old adapter returned Promises from getItem, which got stringified
 * and later crash getCookie() with "Cannot read property 'expires' of null".
 */
function cleanStaleCookieData() {
  if (Platform.OS === "web") return;
  const key = "football_auth_cookie";
  try {
    const data = storage.getItem(key);
    if (!data) return;
    const parsed = JSON.parse(data);
    for (const v of Object.values(parsed)) {
      if (v === null || typeof v !== "object") {
        storage.setItem(key, "{}");
        return;
      }
    }
  } catch {
    try { storage.setItem(key, "{}"); } catch { /* ignore */ }
  }
}

// Promise that resolves when the initial bearer token load completes.
// The custom fetch awaits this before the first request to avoid a race condition
// where useSession() fires getSession() before the token is loaded from storage.
// storage.getItem is now sync on native, but we keep the Promise wrapper so
// createDynamicFetch() can still `await _tokenLoadPromise` uniformly.
export const _tokenLoadPromise: Promise<void> = Promise.resolve().then(() => {
  try {
    const token = storage.getItem(BEARER_TOKEN_KEY);
    if (token) _cachedBearerToken = token;
  } catch {
    // Ignore storage errors on init
  }

  cleanStaleCookieData();
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

// Extract a human-readable error message from API responses.
// Handles both string errors and Zod validation error objects.
function extractApiError(result: any, fallback: string): string {
  if (typeof result.error === "string") return result.error;
  if (result.error?.message) return result.error.message;
  return fallback;
}

// Base URL for localhost development (will be replaced at runtime for deployed environments)
const LOCALHOST_API = "http://localhost:3001";

// Configured API URL (set via configureApiClient)
let _configuredApiUrl: string | null = null;

// Configured Web App URL (set via configureWebAppUrl)
let _configuredWebAppUrl: string | null = null;

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
 * Configure the Web App URL for legal page links.
 * Call this early in your app initialization (e.g., in _layout.tsx).
 * For Expo apps, pass process.env.EXPO_PUBLIC_WEB_APP_URL or use the default.
 */
export function configureWebAppUrl(url: string | undefined) {
  if (url && url.length > 0 && !url.includes("${")) {
    _configuredWebAppUrl = url.trim().replace(/\/$/, "");
  }
}

/**
 * Get the configured Web App URL for legal page links.
 * Falls back to the production Vercel URL.
 */
export function getWebAppUrl(): string {
  if (_configuredWebAppUrl) return _configuredWebAppUrl;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://football-with-friends.vercel.app";
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

      // Preserve credentials set by plugins (expoClient sets "omit" on native).
      // Only default to "include" on web for cross-domain cookie auth.
      const fetchInit: RequestInit = { ...init };
      if (!init?.credentials) {
        fetchInit.credentials = Platform.OS === "web" ? "include" : "omit";
      }

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
          try { storage.setItem(BEARER_TOKEN_KEY, tokenPart); } catch { /* ignore */ }
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

// Create the Better Auth client with Expo plugin for React Native.
// baseURL uses getApiUrl() which resolves process.env.EXPO_PUBLIC_API_URL at build
// time (Metro inlines it). The expoClient plugin reads baseURL directly for the
// OAuth proxy URL, so it must point to the real API — not localhost.
export const authClient = createAuthClient({
  baseURL: getApiUrl(),
  fetchOptions: {
    customFetchImpl: createDynamicFetch(),
  },
  plugins: [
    usernameClient(),
    phoneNumberClient(),
    expoClient({
      scheme: "football-with-friends",
      storagePrefix: "football_auth",
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
  await authClient.phoneNumber.sendOtp({ phoneNumber: data.phoneNumber });

  const result = await authClient.phoneNumber.verify({
    phoneNumber: data.phoneNumber,
    code: data.password,
  });

  if (result.error || !result.data?.token) {
    throw new Error("Invalid phone number or password");
  }

  return result.data;
}

/**
 * Check if a user needs to reset their password (old scrypt hash that
 * can't be verified on CF Workers).
 */
export async function needsPasswordReset(identifier: {
  phoneNumber?: string;
  email?: string;
}): Promise<boolean> {
  try {
    const response = await fetch(
      `${getApiUrl()}/api/phone-auth/needs-password-reset`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(identifier),
      }
    );
    if (!response.ok) return false;
    const result = await response.json();
    return result.needsReset === true;
  } catch {
    return false;
  }
}

/**
 * Reset password for users with old scrypt hashes.
 * Requires the current (old) password as proof of identity.
 */
export async function resetPasswordForMigration(data: {
  phoneNumber?: string;
  email?: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const response = await fetch(
    `${getApiUrl()}/api/phone-auth/reset-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const result = await response.json();
    throw new Error(extractApiError(result, "Failed to reset password"));
  }
}

/**
 * Request a password reset code.
 * The code is stored server-side; user must contact the admin via WhatsApp to get it.
 */
export async function requestPasswordReset(identifier: {
  phoneNumber?: string;
  email?: string;
}): Promise<void> {
  const response = await fetch(
    `${getApiUrl()}/api/phone-auth/forgot-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(identifier),
    }
  );

  if (!response.ok) {
    const result = await response.json();
    throw new Error(extractApiError(result, "Failed to request password reset"));
  }
}

/**
 * Verify reset code and set a new password.
 */
export async function resetPasswordWithCode(data: {
  phoneNumber?: string;
  email?: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  const response = await fetch(
    `${getApiUrl()}/api/phone-auth/verify-reset`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const result = await response.json();
    throw new Error(extractApiError(result, "Failed to reset password"));
  }
}

/**
 * Admin: get pending password reset codes.
 */
export async function getAdminResetCodes(): Promise<
  Array<{ identifier: string; code: string; expiresAt: string }>
> {
  await _tokenLoadPromise;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (_cachedBearerToken) {
    headers["Authorization"] = `Bearer ${_cachedBearerToken}`;
  }

  const response = await fetch(
    `${getApiUrl()}/api/phone-auth/admin/reset-codes`,
    { headers }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch reset codes");
  }

  const result = await response.json();
  return result.codes;
}


/**
 * Delete the current user's account and all associated data.
 * Requires typing a confirmation word and password (for credential accounts).
 */
export async function deleteAccount(confirmText: string, password?: string) {
  await _tokenLoadPromise;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (_cachedBearerToken) {
    headers["Authorization"] = `Bearer ${_cachedBearerToken}`;
  }

  const response = await fetch(`${getApiUrl()}/api/profile/delete-account`, {
    method: "POST",
    headers,
    body: JSON.stringify({ confirmText, password: password || undefined }),
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(
      result.error || "Failed to delete account"
    );
  }

  // Clear local auth state
  await clearBearerToken();
}

// Export types
export type Session = typeof authClient.$Infer.Session;
export type User = Session["user"];
