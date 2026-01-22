// @ts-nocheck - Tamagui's type system with custom config causes recursive type resolution issues
import { TamaguiProvider, Theme, YStack, useTheme as useTamaguiTheme } from "tamagui";
import { PortalProvider } from "@tamagui/portal";
import { Stack } from "expo-router";
import { APIProvider, configureApiClient } from "@repo/api-client";
import { Toast } from "@repo/ui";
import config from "../tamagui.config";
import { ThemeProvider, useThemeContext } from "../lib/theme-context";

// Initialize i18n
import "../lib/i18n";

// Global CSS to fix React Native Web background
import "../global.css";

// Configure API client with the API URL from environment
// This must be done early, before any API calls are made
// The env var is inlined by Expo's babel transform at build time
configureApiClient(process.env.EXPO_PUBLIC_API_URL);

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
        name="index"
        options={{
          headerShown: false,
        }}
      />
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
      <PortalProvider shouldAddRootHost>
        <Theme name={theme}>
          <Toast>
            <YStack flex={1} backgroundColor="$background">
              <APIProvider>
                <AppNavigation />
              </APIProvider>
            </YStack>
          </Toast>
        </Theme>
      </PortalProvider>
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
