// @ts-nocheck - Tamagui type recursion workaround
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { useTheme } from "tamagui";

export default function ProfileLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background?.val,
        },
        headerTintColor: theme.color?.val,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.background?.val,
        },
        // Disable slide animation on web to prevent bleed-through from other tabs
        ...(Platform.OS === "web" ? { animation: "none" } : {}),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t("profile.myProfile"),
        }}
      />
    </Stack>
  );
}
