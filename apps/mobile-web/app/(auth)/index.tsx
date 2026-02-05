// @ts-nocheck - Tamagui type recursion workaround
import { signIn, getConfiguredApiUrl } from "@repo/api-client";
import { Container, Button, Text, YStack, colors } from "@repo/ui";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";

export default function AuthLandingScreen() {
  const { t } = useTranslation();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    console.log("[AUTH] 🔵 Google OAuth button clicked");
    setIsGoogleLoading(true);
    setServerError(null);

    try {
      if (Platform.OS === "web") {
        const apiUrl = getConfiguredApiUrl();
        // Use the frontend URL as callback - oAuthProxy will handle adding the session token
        const frontendCallbackUrl = window.location.origin + "/";
        console.log("[AUTH] 🌐 API URL:", apiUrl);
        console.log("[AUTH] 🔄 Frontend callback URL:", frontendCallbackUrl);

        const response = await fetch(`${apiUrl}/api/auth/sign-in/social`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: "google",
            callbackURL: frontendCallbackUrl,
          }),
          credentials: "include",
        });

        const result = await response.json();
        console.log("[AUTH] 📥 OAuth response:", result);

        if (!response.ok || result.error) {
          console.error("[AUTH] ❌ Google sign in error:", result.error || result);
          setServerError(result.error?.message || t("auth.googleSignInFailed"));
          return;
        }

        if (result.url) {
          console.log("[AUTH] ➡️ Redirecting to Google:", result.url);
          window.location.href = result.url;
        } else {
          console.error("[AUTH] ❌ OAuth did not return redirect URL:", result);
          setServerError(t("auth.googleSignInFailed"));
        }
      } else {
        const result = await signIn.social({
          provider: "google",
          callbackURL: "/",
        });

        if (result.error) {
          console.error("[AUTH] ❌ Google sign in error:", result.error);
          setServerError(result.error.message || t("auth.googleSignInFailed"));
          return;
        }

        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("[AUTH] ❌ Google sign in error:", err);
      setServerError(t("auth.googleSignInFailed"));
    } finally {
      setIsGoogleLoading(false);
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
        <YStack gap="$2" alignItems="center" marginBottom="$4">
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
          >
            📱 {t("auth.signInWithPhone")}
          </Button>

          {/* Google Button - Secondary */}
          <Button
            onPress={handleGoogleAuth}
            variant="outline"
            size="$5"
            width="100%"
            disabled={isGoogleLoading}
            opacity={isGoogleLoading ? 0.5 : 1}
          >
            {isGoogleLoading ? "..." : `🔵 ${t("auth.signInWithGmail")}`}
          </Button>

          {/* Email Button - Secondary */}
          <Button
            onPress={() => router.push("/(auth)/email-signin")}
            variant="outline"
            size="$5"
            width="100%"
          >
            ✉️ {t("auth.withYourEmail")}
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
