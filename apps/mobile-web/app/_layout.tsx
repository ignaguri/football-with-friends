// @ts-nocheck - Tamagui's type system with custom config causes recursive type resolution issues
import {
  APIProvider,
  configureApiClient,
  configureGeneralApiClient,
} from "@repo/api-client";
import { Toast } from "@repo/ui";
import { PortalProvider } from "@tamagui/portal";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import {
  TamaguiProvider,
  Theme,
  YStack,
} from "tamagui";

import { ErrorBoundary } from "../lib/error-boundary";
import "../lib/i18n"; // Initialize i18n
import { RulesModalProvider } from "../lib/rules-modal-context";
import { ThemeProvider, useThemeContext } from "../lib/theme-context";
import config from "../tamagui.config";
import "../global.css"; // Global CSS to fix React Native Web background

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
  return (
    <Stack
      screenOptions={{
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

  // Tamagui's CSS uses :root.t_light/:root.t_dark selectors, so we need to set the class on <html>
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.className = `t_${themeName}`;
    }
  }, [themeName]);

  return (
    <TamaguiProvider key={themeName} config={config} defaultTheme={themeName}>
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
