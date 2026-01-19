// @ts-nocheck - Tamagui type recursion workaround
import { Stack } from "expo-router";
import { useTheme } from "tamagui";
import { useTranslation } from "react-i18next";

export default function AuthLayout() {
  const theme = useTheme();
  const { t } = useTranslation();

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
