// @ts-nocheck - Tamagui's type system with custom config causes recursive type resolution issues

// Tamagui v2 native setup — must run before any Tamagui imports
// setup-burnt: native toast notifications
// setup-gesture-handler: gesture-based components like Sheet
// setup-worklets: animation worklets
// setup-safe-area: safe area token support
// Note: setup-zeego omitted — zeego not installed
import "@tamagui/native/setup-burnt";
import "@tamagui/native/setup-gesture-handler";
import "@tamagui/native/setup-worklets";
import "@tamagui/native/setup-safe-area";

// Import react-native-svg to ensure it's loaded before any SVG components are used
import "react-native-svg";

import {
  APIProvider,
  configureApiClient,
  configureGeneralApiClient,
} from "@repo/api-client";
import { Toast } from "@repo/ui";
import { PortalProvider } from "tamagui";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import { useEffect } from "react";
import { Platform } from "react-native";
import { TamaguiProvider, Theme, YStack } from "tamagui";

import { GestureHandlerRootView } from "react-native-gesture-handler";

import { PWAInstallPrompt } from "../components/pwa-install-prompt";
import { ErrorBoundary } from "../lib/error-boundary";
import "../lib/i18n"; // Initialize i18n
import { unregisterServiceWorker } from "../lib/register-service-worker";
import { RulesModalProvider } from "../lib/rules-modal-context";
import { ThemeProvider, useThemeContext } from "../lib/theme-context";
import config from "../tamagui.config";
import "../global.css"; // Global CSS to fix React Native Web background
import "../assets/fonts/fonts.css"; // Montserrat font declarations for web

// Both auth and general API use EXPO_PUBLIC_API_URL directly so they always
// hit the same backend environment (staging for preview, production for production).
// This avoids a mismatch where auth tokens issued by one environment are sent to another.
const getAuthApiUrl = () => process.env.EXPO_PUBLIC_API_URL;
const getGeneralApiUrl = () => process.env.EXPO_PUBLIC_API_URL;

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

  // Ensure any previously registered service workers are removed.
  // Old service workers can serve HTML for hashed JS assets, causing MIME errors.
  useEffect(() => {
    if (Platform.OS === "web") {
      unregisterServiceWorker().catch(console.error);
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

          {/* Google Identity Services for OAuth without redirect flow */}
          <script src="https://accounts.google.com/gsi/client" async defer />
        </Head>
      )}
      <TamaguiProvider key={themeName} config={config} defaultTheme={themeName} defaultFont="body">
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
