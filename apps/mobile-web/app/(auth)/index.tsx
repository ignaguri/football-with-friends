// @ts-nocheck - Tamagui type recursion workaround
import { signIn, getConfiguredApiUrl } from "@repo/api-client";
import { Container, Button, Text, YStack, XStack, Image, colors } from "@repo/ui";
import { Mail } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { useTheme } from "tamagui";

export default function AuthLandingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Detect dark mode for Google button styling
  const isDark = theme.background?.val === "#000000" || theme.background?.val?.startsWith("#1");

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
          // Use a link element to bypass Service Worker navigation interception
          const link = document.createElement("a");
          link.href = result.url;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return; // Exit early to prevent re-render from finally block
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
              <Text color="white" fontSize="$5" fontFamily="$body" fontWeight="400">
                {t("auth.signInWithPhone")}
              </Text>
            </XStack>
          </Button>

          {/* Google Button - Following Google Brand Guidelines */}
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
