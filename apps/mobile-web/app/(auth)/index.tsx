import { getConfiguredApiUrl, signIn, getSession, storeBearerToken } from "@repo/api-client";
import * as Sentry from "@sentry/react-native";
// @ts-nocheck - Tamagui type recursion workaround
import {
  Container,
  Button,
  Text,
  YStack,
  XStack,
  Image,
} from "@repo/ui";
import { Mail } from "@tamagui/lucide-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Device from "expo-device";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { useTheme } from "tamagui";

import { GoogleSignInWeb } from "../../components/GoogleSignInWeb";
import { useThemeContext } from "../../lib/theme-context";

export default function AuthLandingScreen() {
  const { t } = useTranslation();
  const { theme } = useThemeContext();
  const tamaguiTheme = useTheme();
  const isDark = theme === "dark";
  // Preserve a deep-link redirect (e.g. /join/:token) across the signin flow.
  // Only internal paths are accepted — anything else falls back to /(tabs)
  // to avoid open-redirect abuse if someone crafts a malicious link.
  const params = useLocalSearchParams<{ redirectTo?: string | string[] }>();
  const rawRedirect = Array.isArray(params.redirectTo)
    ? params.redirectTo[0]
    : params.redirectTo;
  const redirectTo =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : undefined;
  const forwardParams = redirectTo ? { redirectTo } : undefined;
  // `tintColor` is a native image prop — resolve the theme token to a real color
  const whatsappTintColor = tamaguiTheme.brandWhatsapp?.val ?? "#25D366";
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then((available) => setIsAppleAvailable(available))
      .catch((err) => {
        console.warn("[AUTH] Apple availability check failed:", err);
      });
  }, []);

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setServerError(null);

    try {
      if (Platform.OS === "web") {
        const callbackURL = `${getConfiguredApiUrl()}/api/auth/web-callback?redirect=${encodeURIComponent(
          window.location.origin + "/",
        )}`;

        const result = await signIn.social({
          provider: "google",
          callbackURL,
          fetchOptions: {
            onSuccess: (ctx) => {
              const redirectUrl =
                ctx.response.headers.get("location") || (ctx.data as any)?.url;
              if (redirectUrl) {
                window.location.assign(redirectUrl);
              }
            },
          },
        });

        if (result.error) {
          setServerError(result.error.message || t("auth.googleSignInFailed"));
          setIsGoogleLoading(false);
          return;
        }

        if ((result.data as any)?.url) {
          window.location.assign((result.data as any).url);
          return;
        }

        if (result.data?.user) {
          router.replace("/(tabs)");
        }
      } else {
        // Native OAuth: expoClient handles the browser flow, cookie extraction,
        // and session signal notification. We just need to call signIn.social()
        // and then check the session.
        const result = await signIn.social({
          provider: "google",
          callbackURL: "/",
        });

        if (result.error) {
          setServerError(result.error.message || t("auth.googleSignInFailed"));
          setIsGoogleLoading(false);
          return;
        }

        // expoClient's onSuccess hook stores the cookie and notifies $sessionSignal.
        // Verify session was established and navigate.
        const session = await getSession();
        if (session.data?.user) {
          // Store the session token as bearer token for the general API client.
          // OAuth flows use cookies (expoClient), but client.ts uses bearer tokens.
          if (session.data.session?.token) {
            await storeBearerToken(session.data.session.token);
          }
          router.replace("/(tabs)");
        } else {
          setIsGoogleLoading(false);
        }
      }
    } catch (err: any) {
      setServerError(err?.message || t("auth.googleSignInFailed"));
      setIsGoogleLoading(false);
    }
    // Note: Don't reset loading state here - BetterAuth will redirect away
  };

  const handleAppleSignIn = async () => {
    setServerError(null);
    Sentry.addBreadcrumb({ category: "apple-auth", message: "Starting Apple sign-in", level: "info" });

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      Sentry.addBreadcrumb({
        category: "apple-auth",
        message: "Got Apple credential",
        level: "info",
        data: {
          hasIdentityToken: !!credential.identityToken,
          hasAuthorizationCode: !!credential.authorizationCode,
          hasFullName: !!credential.fullName,
          hasEmail: !!credential.email,
        },
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
        Sentry.captureMessage("Apple Sign-In: signIn.social returned error", {
          level: "error",
          extra: { error: result.error },
        });
        setServerError(result.error.message || t("auth.appleSignInFailed"));
        return;
      }

      if (result.data?.user) {
        // Store the session token as bearer token for the general API client.
        const session = await getSession();
        if (session.data?.session?.token) {
          await storeBearerToken(session.data.session.token);
        }
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      console.error("[AUTH] Apple Sign-In error:", err?.code, err?.message);
      if (err?.code !== "ERR_REQUEST_CANCELED") {
        Sentry.captureException(err, {
          tags: { source: "apple-sign-in" },
          extra: { code: err?.code, message: err?.message },
        });
        const message = err?.message || t("auth.appleSignInFailed");
        setServerError(message);
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
          <Text fontSize="$10" fontWeight="bold" textAlign="center" lineHeight="$10">
            Football con los pibes
          </Text>
          <Text color="$gray11" textAlign="center">
            {t("auth.signInToContinue")}
          </Text>
        </YStack>

        {/* Auth Options */}
        <YStack gap="$3" alignSelf="stretch" alignItems="stretch">
          {/* Phone Button - Primary */}
          <Button
            onPress={() =>
              router.push({
                pathname: "/(auth)/phone-signin",
                params: forwardParams,
              })
            }
            variant="navy"
            size="$5"
            width="100%"
            fontWeight="400"
            testID="auth-landing-phone-btn"
          >
            <XStack gap="$3" alignItems="center" justifyContent="center">
              <Image
                source={require("../../assets/whatsapp-logo.svg")}
                style={{ width: 24, height: 24 }}
                tintColor={whatsappTintColor}
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
              clientId={(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "").trim()}
              onSuccess={() => {
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
                  testID="auth-landing-google-btn"
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
              testID="auth-landing-google-btn"
              backgroundColor="$googleButtonBg"
              borderWidth={1}
              borderColor="$googleButtonBorder"
              hoverStyle={{
                backgroundColor: "$googleButtonBgHover",
                borderColor: "$googleButtonBorderHover",
                transform: [{ scale: 1.01 }],
              }}
              pressStyle={{
                backgroundColor: "$googleButtonBgPress",
                borderColor: "$googleButtonBorderHover",
                transform: [{ scale: 0.99 }],
              }}
              paddingHorizontal="$3"
              animation="quick"
            >
              <XStack gap="$3" alignItems="center" justifyContent="center">
                {isGoogleLoading ? (
                  <Text
                    color="$googleButtonText"
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
                      color="$googleButtonText"
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

          {/* Apple Sign In - only when available (real device with Face ID/Touch ID) */}
          {isAppleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={
                isDark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={8}
              style={{ width: "100%", height: 50 }}
              onPress={handleAppleSignIn}
            />
          )}

          {/* Email Button - Secondary */}
          <Button
            onPress={() =>
              router.push({
                pathname: "/(auth)/email-signin",
                params: forwardParams,
              })
            }
            variant="outline"
            size="$5"
            fontWeight="400"
            testID="auth-landing-email-btn"
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
