import { TamaguiProvider, Theme, YStack, useTheme as useTamaguiTheme } from "tamagui";
import { Stack } from "expo-router";
import { APIProvider } from "@repo/api-client";
import config from "../tamagui.config";
import { ThemeProvider, useThemeContext } from "../lib/theme-context";

// Initialize i18n
import "../lib/i18n";

// Global CSS to fix React Native Web background
import "../global.css";

function AppNavigation() {
  const theme = useTamaguiTheme();

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
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(auth)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

function AppContent() {
  const { theme } = useThemeContext();

  return (
    <TamaguiProvider config={config} defaultTheme={theme}>
      <Theme name={theme}>
        <YStack flex={1} backgroundColor="$background">
          <APIProvider>
            <AppNavigation />
          </APIProvider>
        </YStack>
      </Theme>
    </TamaguiProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
