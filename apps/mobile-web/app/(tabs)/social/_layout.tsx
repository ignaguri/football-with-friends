// @ts-nocheck - Tamagui type recursion workaround
import { Stack, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "tamagui";
import { Pressable } from "react-native";
import { ChevronLeft } from "@tamagui/lucide-icons";

export default function SocialLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  const BackButton = () => (
    <Pressable onPress={() => router.back()} style={{ marginLeft: 8 }}>
      <ChevronLeft size={28} color={theme.color?.val} />
    </Pressable>
  );

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
          headerBackVisible: false,
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="[userId]"
        options={{
          title: t("playerStats.playerProfile"),
          headerBackVisible: false,
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack>
  );
}
