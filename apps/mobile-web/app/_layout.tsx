// @ts-nocheck - Tamagui's type system with custom config causes recursive type resolution issues
import {
  APIProvider,
  configureApiClient,
  configureGeneralApiClient,
} from "@repo/api-client";
import { Toast } from "@repo/ui";
import { PortalProvider } from "@tamagui/portal";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import { useEffect } from "react";
import { Platform } from "react-native";
import { TamaguiProvider, Theme, YStack } from "tamagui";

// Import react-native-svg to ensure it's loaded and registered before any SVG components are used
// This prevents "View config getter callback for component `RNSVGPath` must be a function" errors
import "react-native-svg";

import { PWAInstallPrompt } from "../components/pwa-install-prompt";
import { ErrorBoundary } from "../lib/error-boundary";
import "../lib/i18n"; // Initialize i18n
import { registerServiceWorker } from "../lib/register-service-worker";
import { RulesModalProvider } from "../lib/rules-modal-context";
import { ThemeProvider, useThemeContext } from "../lib/theme-context";
import config from "../tamagui.config";
import "../global.css"; // Global CSS to fix React Native Web background
import "../assets/fonts/fonts.css"; // Montserrat font declarations for web

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

  // Register service worker for PWA support
  useEffect(() => {
    if (Platform.OS === "web") {
      registerServiceWorker();
    }
  }, []);

  return (
    <>
      {Platform.OS === "web" && (
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />

          {/* PWA Meta Tags */}
          <meta name="application-name" content="Football with Friends" />
          <meta
            name="description"
            content="Organize and manage football matches with friends"
          />
          <meta
            name="theme-color"
            content="#3d7c48"
            media="(prefers-color-scheme: light)"
          />
          <meta
            name="theme-color"
            content="#4ca861"
            media="(prefers-color-scheme: dark)"
          />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="default"
          />
          <meta name="apple-mobile-web-app-title" content="Football" />
          <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
          <link
            rel="apple-touch-icon"
            sizes="152x152"
            href="/icons/icon-152x152.png"
          />
          <link
            rel="apple-touch-icon"
            sizes="192x192"
            href="/icons/icon-192x192.png"
          />
          <link rel="manifest" href="/manifest.json" />
        </Head>
      )}
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
              <PWAInstallPrompt />
            </Toast>
          </Theme>
        </PortalProvider>
      </TamaguiProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
