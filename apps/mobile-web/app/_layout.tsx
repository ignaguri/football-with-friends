// @ts-nocheck - Tamagui's type system with custom config causes recursive type resolution issues
import {
  TamaguiProvider,
  Theme,
  YStack,
  useTheme as useTamaguiTheme,
} from "tamagui";
import {
  APIProvider,
  configureApiClient,
  configureGeneralApiClient,
} from "@repo/api-client";
import { Toast } from "@repo/ui";
import { PortalProvider } from "@tamagui/portal";
import { Stack } from "expo-router";

import { ErrorBoundary } from "../lib/error-boundary";

// Initialize i18n
import "../lib/i18n";

// Global CSS to fix React Native Web background
import "../global.css";

// Configure API clients with the API URL
// Auth client: MUST use direct CF Workers URL for cross-origin OAuth to work
// (The Expo plugin stores session in AsyncStorage, bypassing cookie domain issues)
// General API client: Can use Vercel proxy on web for same-origin requests
import { Platform } from "react-native";

import { RulesModalProvider } from "../lib/rules-modal-context";
import { ThemeProvider, useThemeContext } from "../lib/theme-context";
import config from "../tamagui.config";

// Auth always uses direct API URL for proper OAuth callback handling
const getAuthApiUrl = () => process.env.EXPO_PUBLIC_API_URL;

// General API can use Vercel proxy on deployed web (same-origin requests)
// but must use direct API URL locally (no proxy from Expo dev server)
const getGeneralApiUrl = () => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const origin = window.location.origin;
    // Only use same-origin proxy on deployed Vercel (not localhost)
    if (!origin.includes("localhost")) {
      return origin;
    }
  }
  return process.env.EXPO_PUBLIC_API_URL;
};

configureApiClient(getAuthApiUrl());
configureGeneralApiClient(getGeneralApiUrl());

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
  // Ensure we always pass a valid theme name (Tamagui throws "Missing theme" if invalid/missing)
  const themeName = theme === "dark" ? "dark" : "light";

  return (
    <TamaguiProvider config={config} defaultTheme={themeName}>
      <PortalProvider shouldAddRootHost>
        <Theme name={themeName}>
          <Toast>
            <YStack flex={1} backgroundColor="$background">
              <ErrorBoundary>
                <APIProvider>
                  <RulesModalProvider>
                    <AppNavigation />
                  </RulesModalProvider>
                </APIProvider>
              </ErrorBoundary>
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
