// @ts-nocheck - Tamagui type recursion workaround
import { useSession } from "@repo/api-client";
import { Stack, Redirect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { useTheme, YStack, Spinner } from "tamagui";

export default function AuthLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: session, isPending } = useSession();

  // Show loading spinner while checking authentication
  if (isPending) {
    return (
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="$background"
      >
        <Spinner size="large" />
      </YStack>
    );
  }

  // Redirect to tabs if already authenticated
  if (session?.user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background?.val,
        },
        headerTintColor: theme.color?.val,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerTitle: "", // Hide the route name from header
        contentStyle: {
          backgroundColor: theme.background?.val,
        },
        // Disable slide animation on web to prevent bleed-through
        ...(Platform.OS === "web" ? { animation: "none" } : {}),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="phone-signin"
        options={{
          headerTitle: "",
        }}
      />
      <Stack.Screen
        name="phone-signup"
        options={{
          headerTitle: "",
        }}
      />
      <Stack.Screen
        name="email-signin"
        options={{
          headerTitle: "",
        }}
      />
      <Stack.Screen
        name="email-signup"
        options={{
          headerTitle: "",
        }}
      />
    </Stack>
  );
}
