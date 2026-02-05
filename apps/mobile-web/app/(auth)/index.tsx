// @ts-nocheck - Tamagui type recursion workaround
import { signIn, getConfiguredApiUrl } from "@repo/api-client";
import { Container, Button, Text, YStack } from "@repo/ui";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";

export default function AuthLandingScreen() {
  const { t } = useTranslation();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setServerError(null);

    try {
      if (Platform.OS === "web") {
        const apiUrl = getConfiguredApiUrl();
        const webCallbackUrl = `${apiUrl}/api/auth/web-callback?redirect=${encodeURIComponent(window.location.origin + "/")}`;

        const response = await fetch(`${apiUrl}/api/auth/sign-in/social`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: "google",
            callbackURL: webCallbackUrl,
          }),
          credentials: "include",
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          console.error("Google sign in error:", result.error || result);
          setServerError(result.error?.message || t("auth.googleSignInFailed"));
          return;
        }

        if (result.url) {
          window.location.href = result.url;
        } else {
          console.error("OAuth did not return redirect URL:", result);
          setServerError(t("auth.googleSignInFailed"));
        }
      } else {
        const result = await signIn.social({
          provider: "google",
          callbackURL: "/",
        });

        if (result.error) {
          console.error("Google sign in error:", result.error);
          setServerError(result.error.message || t("auth.googleSignInFailed"));
          return;
        }

        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("Google sign in error:", err);
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
