import { getConfiguredApiUrl, signIn } from "@repo/api-client";
// @ts-nocheck - Tamagui type recursion workaround
import {
  Container,
  Button,
  Text,
  YStack,
  XStack,
  Image,
  colors,
} from "@repo/ui";
import { Mail } from "@tamagui/lucide-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { useTheme } from "tamagui";

import { GoogleSignInWeb } from "../../components/GoogleSignInWeb";

export default function AuthLandingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Detect dark mode for Google button styling
  const isDark =
    theme.background?.val === "#000000" ||
    theme.background?.val?.startsWith("#1");

  const handleGoogleAuth = async () => {
    console.log("[AUTH] 🔵 Google OAuth button clicked");
    setIsGoogleLoading(true);
    setServerError(null);

    try {
      // For web, we need to pass the full URL since the OAuth callback comes from Google
      const callbackURL =
        typeof window !== "undefined"
          ? `${getConfiguredApiUrl()}/api/auth/web-callback?redirect=${encodeURIComponent(
              window.location.origin + "/",
            )}`
          : "/";

      console.log("[AUTH] 🚀 Calling signIn.social with BetterAuth client");
      console.log("[AUTH] 📍 Callback URL:", callbackURL);

      // Use fetchOptions to get the redirect URL without auto-redirecting
      // BetterAuth's default redirect uses window.location.href which doesn't work on Vercel
      const result = await signIn.social({
        provider: "google",
        callbackURL,
        fetchOptions: {
          onSuccess: (ctx) => {
            // Handle redirect manually using window.location.assign() which works on Vercel
            const redirectUrl =
              ctx.response.headers.get("location") || (ctx.data as any)?.url;
            if (redirectUrl) {
              console.log("[AUTH] ➡️ Manually redirecting to:", redirectUrl);
              window.location.assign(redirectUrl);
            }
          },
        },
      });

      console.log("[AUTH] 📥 signIn.social result:", result);

      if (result.error) {
        console.error("[AUTH] ❌ Google sign in error:", result.error);
        setServerError(result.error.message || t("auth.googleSignInFailed"));
        setIsGoogleLoading(false);
        return;
      }

      // If we have a URL in the result, redirect manually
      if ((result.data as any)?.url) {
        console.log("[AUTH] ➡️ Redirecting via result.data.url");
        window.location.assign((result.data as any).url);
        return;
      }

      // If we get here without redirect, navigate to tabs
      if (result.data?.user) {
        console.log("[AUTH] ✅ Sign in successful, navigating to tabs");
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("[AUTH] ❌ Google sign in error:", err);
      setServerError(t("auth.googleSignInFailed"));
      setIsGoogleLoading(false);
    }
    // Note: Don't reset loading state here - BetterAuth will redirect away
  };

  const handleAppleSignIn = async () => {
    setServerError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }

      const result = await signIn.social({
        provider: "apple",
        idToken: {
          token: credential.identityToken,
        },
      });

      if (result.error) {
        setServerError(result.error.message || t("auth.appleSignInFailed"));
        return;
      }

      if (result.data?.user) {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      if (err?.code !== "ERR_REQUEST_CANCELED") {
        setServerError(t("auth.appleSignInFailed"));
      }
    }
  };

  return (
    <Container variant="padded">
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        gap="$4"
        maxWidth={400}
        marginHorizontal="auto"
        paddingVertical="$8"
      >
        {/* Title */}
        <YStack gap="$5" alignItems="center" marginBottom="$4">
          <Text fontSize="$10" fontWeight="bold" textAlign="center">
            Football con los pibes
          </Text>
          <Text color="$gray11" textAlign="center">
            {t("auth.signInToContinue")}
          </Text>
        </YStack>

        {/* Auth Options */}
        <YStack gap="$3" width="100%">
          {/* Phone Button - Primary */}
          <Button
            onPress={() => router.push("/(auth)/phone-signin")}
            variant="primary"
            size="$5"
            width="100%"
            backgroundColor={colors.navyBlue}
            hoverStyle={{ backgroundColor: colors.navyBlueHover }}
            pressStyle={{ backgroundColor: colors.navyBlueHover }}
            fontWeight="400"
          >
            <XStack gap="$3" alignItems="center" justifyContent="center">
              <Image
                source={require("../../assets/whatsapp-logo.svg")}
                style={{ width: 24, height: 24 }}
                tintColor="#25D366"
              />
              <Text
                color="white"
                fontSize="$5"
                fontFamily="$body"
                fontWeight="400"
              >
                {t("auth.signInWithPhone")}
              </Text>
            </XStack>
          </Button>

          {/* Google Button - Web uses GIS (ID token flow), Native uses redirect flow */}
          {Platform.OS === "web" ? (
            <GoogleSignInWeb
              clientId={process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || ""}
              onSuccess={() => {
                console.log("[AUTH] Google sign-in successful, navigating to tabs");
                // Use window.location.href instead of router.replace to force a full page reload
                // This ensures useSession() gets fresh state instead of cached "no session"
                if (typeof window !== "undefined") {
                  window.location.href = "/(tabs)";
                } else {
                  router.replace("/(tabs)");
                }
              }}
              onError={(err) => {
                console.error("[AUTH] Google sign-in error:", err);
                setServerError(err);
                setIsGoogleLoading(false);
              }}
              renderCustomButton={(onClick) => (
                <Button
                  onPress={() => {
                    setIsGoogleLoading(true);
                    onClick();
                  }}
                  variant="outline"
                  size="$5"
                  width="100%"
                  disabled={isGoogleLoading}
                  opacity={isGoogleLoading ? 0.5 : 1}
                  fontWeight="400"
                >
                  <XStack gap="$3" alignItems="center" justifyContent="center">
                    <Image
                      source={require("../../assets/google/google-logo.svg")}
                      style={{ width: 24, height: 24 }}
                    />
                    <Text
                      fontSize="$5"
                      fontFamily="$body"
                      fontWeight="400"
                    >
                      {isGoogleLoading ? t("auth.signingIn") : t("auth.signInWithGmail")}
                    </Text>
                  </XStack>
                </Button>
              )}
            />
          ) : (
            // Native button - uses redirect-based OAuth (for future mobile support)
            <Button
              onPress={handleGoogleAuth}
              size="$5"
              width="100%"
              disabled={isGoogleLoading}
              opacity={isGoogleLoading ? 0.5 : 1}
              backgroundColor={isDark ? "#131314" : "white"}
              borderWidth={1}
              borderColor={isDark ? "#8E918F" : "#747775"}
              hoverStyle={{
                backgroundColor: isDark ? "#2A2A2A" : "#F8F9FA",
                borderColor: isDark ? "#C1C1C1" : "#4285F4",
                transform: [{ scale: 1.01 }],
              }}
              pressStyle={{
                backgroundColor: isDark ? "#3A3A3A" : "#E8F0FE",
                borderColor: isDark ? "#C1C1C1" : "#4285F4",
                transform: [{ scale: 0.99 }],
              }}
              paddingHorizontal="$3"
              animation="quick"
            >
              <XStack gap="$3" alignItems="center" justifyContent="center">
                {isGoogleLoading ? (
                  <Text
                    color={isDark ? "#E3E3E3" : "#1F1F1F"}
                    fontSize="$5"
                    fontFamily="$body"
                  >
                    ...
                  </Text>
                ) : (
                  <>
                    <Image
                      source={
                        isDark
                          ? require("../../assets/google/google-logo-dark.svg")
                          : require("../../assets/google/google-logo.svg")
                      }
                      style={{ width: 24, height: 24 }}
                    />
                    <Text
                      color={isDark ? "#E3E3E3" : "#1F1F1F"}
                      fontSize="$5"
                      fontFamily="$body"
                      fontWeight="500"
                    >
                      {t("auth.signInWithGmail")}
                    </Text>
                  </>
                )}
              </XStack>
            </Button>
          )}

          {/* Apple Sign In - iOS native only */}
          {Platform.OS === "ios" && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={{ width: "100%", height: 50 }}
              onPress={handleAppleSignIn}
            />
          )}

          {/* Email Button - Secondary */}
          <Button
            onPress={() => router.push("/(auth)/email-signin")}
            variant="outline"
            size="$5"
            width="100%"
            fontWeight="400"
          >
            <XStack gap="$3" alignItems="center" justifyContent="center">
              <Mail size={24} color="$gray11" />
              <Text fontSize="$5" fontFamily="$body" fontWeight="400">
                {t("auth.withYourEmail")}
              </Text>
            </XStack>
          </Button>
        </YStack>

        {/* Error Message */}
        {serverError && (
          <Text color="$red10" fontSize="$3" textAlign="center" marginTop="$2">
            {serverError}
          </Text>
        )}
      </YStack>
    </Container>
  );
}
