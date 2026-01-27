// @ts-nocheck - Tamagui type recursion workaround
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "tamagui";

export default function SocialLayout() {
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
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t("social.title"),
        }}
      />
      <Stack.Screen
        name="stats"
        options={{
          title: t("playerStats.statsHub"),
        }}
      />
      <Stack.Screen
        name="[userId]"
        options={{
          title: t("playerStats.playerProfile"),
        }}
      />
    </Stack>
  );
}
