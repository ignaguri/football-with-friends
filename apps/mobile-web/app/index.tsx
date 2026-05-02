// @ts-nocheck - Tamagui type recursion workaround
import { useSession, getSession, storeBearerToken } from "@repo/api-client";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { YStack, Spinner } from "tamagui";

/**
 * Root index route - handles "/" navigation on web
 * Redirects to appropriate route based on authentication status
 * Also handles OAuth callback with session token from oAuthProxy
 */
export default function Index() {
  const { data: session, isPending, refetch } = useSession();
  const [isHandlingCallback, setIsHandlingCallback] = useState(false);

  // Handle OAuth callback with session token from URL
  // The web-callback endpoint passes session_token in the query params
  // Also supports legacy __session_token from oAuthProxy
  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (Platform.OS !== "web" || typeof window === "undefined") return;

      const url = new URL(window.location.href);
      const sessionToken =
        url.searchParams.get("session_token") || url.searchParams.get("__session_token");

      if (sessionToken) {
        setIsHandlingCallback(true);
        try {
          await storeBearerToken(sessionToken);

          url.searchParams.delete("session_token");
          url.searchParams.delete("__session_token");
          window.history.replaceState({}, "", url.pathname + url.search);

          await refetch();
        } catch (error) {
          console.error("[INDEX] Error handling OAuth callback:", error);
        } finally {
          setIsHandlingCallback(false);
        }
      } else {
        getSession();
      }
    };

    handleOAuthCallback();
  }, []);

  // Show loading spinner while checking authentication or handling callback
  if (isPending || isHandlingCallback) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" />
      </YStack>
    );
  }

  // Redirect based on auth status
  return <Redirect href={session?.user ? "/(tabs)" : "/(auth)"} />;
}
