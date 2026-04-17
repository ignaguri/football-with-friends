// @ts-nocheck - Tamagui type recursion workaround
import { ChevronLeft } from "@tamagui/lucide-icons";
import { Stack, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform, Pressable } from "react-native";
import { useTheme } from "tamagui";

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
        contentStyle: {
          backgroundColor: theme.background?.val,
        },
        ...(Platform.OS === "web" ? { animation: "none" } : {}),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t("nav.matches"),
        }}
      />
      <Stack.Screen
        name="[matchId]/index"
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
      <Stack.Screen
        name="[matchId]/gallery"
        options={({ route }) => ({
          title: t("multimedia.title"),
          headerBackVisible: false,
          headerLeft: () => {
            const matchId = (route.params as { matchId?: string } | undefined)
              ?.matchId;
            return (
              <Pressable
                onPress={() => {
                  // Replace the gallery in history with the owning match
                  // detail. Neither router.back() nor window.history.back()
                  // are reliable here — Expo Router's tab-aware stack can
                  // collapse to the root when the gallery was pushed across
                  // a tab boundary (Social/Multimedia → Matches), and using
                  // router.push would create a back-and-forth loop between
                  // match detail and gallery. router.replace keeps history
                  // sane: from the match detail, the next back takes the
                  // user to wherever they were before entering the gallery.
                  if (matchId) {
                    router.replace(`/(tabs)/matches/${matchId}`);
                  } else {
                    router.replace("/(tabs)/matches");
                  }
                }}
                style={{ marginLeft: 8 }}
              >
                <ChevronLeft size={28} color={theme.color?.val} />
              </Pressable>
            );
          },
        })}
      />
    </Stack>
  );
}
