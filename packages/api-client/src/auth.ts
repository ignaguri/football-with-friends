// Auth client for Expo/React Native
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

// Get API URL from environment
function getApiUrl(): string {
  // For Expo, use EXPO_PUBLIC_ prefix
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Default to localhost for development
  return "http://localhost:3001";
}

const API_URL = getApiUrl();

// Create the Better Auth client with username plugin
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [usernameClient()],
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
