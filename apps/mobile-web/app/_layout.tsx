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
// Auth client: MUST use direct CF Workers URL for cross-origin OAuth to work
// (The Expo plugin stores session in AsyncStorage, bypassing cookie domain issues)
// General API client: Can use Vercel proxy on web for same-origin requests
import { Platform } from "react-native";

// Auth always uses direct API URL for proper OAuth callback handling
const getAuthApiUrl = () => process.env.EXPO_PUBLIC_API_URL;

// General API can use proxy on web (optional optimization)
const getGeneralApiUrl = () => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
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
