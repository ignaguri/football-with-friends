// @ts-nocheck - Tamagui type recursion workaround
import { Stack, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "tamagui";
import { Pressable } from "react-native";
import { ChevronLeft } from "@tamagui/lucide-icons";

export default function AdminLayout() {
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
          title: t("organizer.title"),
        }}
      />
      <Stack.Screen
        name="add-match"
        options={{
          title: t("addMatch.title"),
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
