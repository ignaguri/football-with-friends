// @ts-nocheck - Tamagui type recursion workaround
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "tamagui";

export default function RulesLayout() {
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
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Rules & Info",
        }}
      />
    </Stack>
  );
}
