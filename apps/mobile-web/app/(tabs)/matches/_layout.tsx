// @ts-nocheck - Tamagui type recursion workaround
import { Stack, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "tamagui";
import { Pressable } from "react-native";
import { ChevronLeft } from "@tamagui/lucide-icons";

export default function MatchesLayout() {
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
          title: t("nav.matches"),
        }}
      />
      <Stack.Screen
        name="[matchId]"
        options={{
          title: t("nav.matches"),
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <ChevronLeft size={28} color={theme.color?.val} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
