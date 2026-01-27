// @ts-nocheck - Tamagui type recursion workaround
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "tamagui";

export default function PlayersLayout() {
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
          title: t("playerStats.tabTitle"),
        }}
      />
      <Stack.Screen
        name="stats"
        options={{
          title: t("playerStats.statsHub"),
        }}
      />
      <Stack.Screen
        name="my-info"
        options={{
          title: t("playerStats.myInfo"),
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
