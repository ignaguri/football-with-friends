// @ts-nocheck - Tamagui's type system with custom config causes recursive type resolution issues
import { TamaguiProvider, Theme, YStack, useTheme as useTamaguiTheme } from "tamagui";
import { PortalProvider } from "@tamagui/portal";
import { Stack } from "expo-router";
import { APIProvider, configureApiClient, configureGeneralApiClient } from "@repo/api-client";
import { Toast } from "@repo/ui";
import config from "../tamagui.config";
import { ThemeProvider, useThemeContext } from "../lib/theme-context";

// Initialize i18n
import "../lib/i18n";

// Global CSS to fix React Native Web background
import "../global.css";

// Configure API clients with the API URL
// On web: use same-origin (window.location.origin) since Vercel proxies /api/* to CF Workers
// On native: use the full API URL from environment
import { Platform } from "react-native";
const getApiUrl = () => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.EXPO_PUBLIC_API_URL;
};
configureApiClient(getApiUrl());
configureGeneralApiClient(getApiUrl());

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
