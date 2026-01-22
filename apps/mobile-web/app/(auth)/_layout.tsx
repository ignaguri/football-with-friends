// @ts-nocheck - Tamagui type recursion workaround
import { Stack, Redirect } from "expo-router";
import { useTheme, YStack, Spinner } from "tamagui";
import { useTranslation } from "react-i18next";
import { useSession } from "@repo/api-client";

export default function AuthLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: session, isPending } = useSession();

  // Show loading spinner while checking authentication
  if (isPending) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
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
      }}
    >
      <Stack.Screen
        name="sign-in"
        options={{
          title: t("auth.signIn"),
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          title: t("auth.signUp"),
          headerBackVisible: true,
        }}
      />
    </Stack>
  );
}
