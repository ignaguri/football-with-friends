// @ts-nocheck - Tamagui type recursion workaround
import { Redirect } from "expo-router";
import { useSession } from "@repo/api-client";
import { YStack, Spinner } from "tamagui";

/**
 * Root index route - handles "/" navigation on web
 * Redirects to appropriate route based on authentication status
 */
export default function Index() {
  const { data: session, isPending } = useSession();

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
