// @ts-nocheck - Tamagui type recursion workaround
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "tamagui";

export default function PlayerLayout() {
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
          title: t("player.title"),
        }}
      />
      <Stack.Screen
        name="my-info"
        options={{
          title: t("playerStats.myInfo"),
        }}
      />
      <Stack.Screen
        name="my-stats"
        options={{
          title: t("player.myStats"),
        }}
      />
    </Stack>
  );
}
