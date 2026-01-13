import { createAuthClient } from "better-auth/react";

const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return "http://localhost:3001";
};

export const authClient = createAuthClient({
  baseURL: getApiUrl(),
});

export const { signIn, signOut, useSession } = authClient;
