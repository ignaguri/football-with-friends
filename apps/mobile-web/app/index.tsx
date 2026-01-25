// @ts-nocheck - Tamagui type recursion workaround
import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useSession, getSession } from "@repo/api-client";
import { YStack, Spinner } from "tamagui";

/**
 * Root index route - handles "/" navigation on web
 * Redirects to appropriate route based on authentication status
 */
export default function Index() {
  const { data: session, isPending } = useSession();

  // Force session refresh on mount to pick up OAuth callback result
  // This is needed because after OAuth redirect, the session may not be
  // automatically fetched by useSession
  useEffect(() => {
    getSession();
  }, []);

  // Show loading spinner while checking authentication
  if (isPending) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" />
      </YStack>
    );
  }

  // Redirect based on auth status
  return <Redirect href={session?.user ? "/(tabs)" : "/(auth)/sign-in"} />;
}
