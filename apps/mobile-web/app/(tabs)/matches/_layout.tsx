import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
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
        }}
      />
    </Stack>
  );
}
