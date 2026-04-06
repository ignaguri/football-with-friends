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
  colors,
} from "@repo/ui";
import { Mail } from "@tamagui/lucide-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Device from "expo-device";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, ScrollView } from "react-native";
import { useTheme } from "tamagui";

import { GoogleSignInWeb } from "../../components/GoogleSignInWeb";

export default function AuthLandingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [...prev, `[${ts}] ${msg}`]);
  };

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then((available) => setIsAppleAvailable(available))
      .catch((err) => {
        console.warn("[AUTH] Apple availability check failed:", err);
      });
  }, []);

  // Detect dark mode for Google button styling
  const isDark =
    theme.background?.val === "#000000" ||
    theme.background?.val?.startsWith("#1");

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
    addLog("Starting Apple sign-in...");
    Sentry.addBreadcrumb({ category: "apple-auth", message: "Starting Apple sign-in", level: "info" });

    try {
      addLog("Calling AppleAuthentication.signInAsync()...");
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      addLog(`Got credential: token=${!!credential.identityToken}, authCode=${!!credential.authorizationCode}, email=${credential.email || "null"}, user=${credential.user?.slice(0, 8)}`);
      Sentry.addBreadcrumb({
        category: "apple-auth",
        message: "Got Apple credential",
        level: "info",
        data: {
          hasIdentityToken: !!credential.identityToken,
          hasAuthorizationCode: !!credential.authorizationCode,
          hasFullName: !!credential.fullName,
          hasEmail: !!credential.email,
          user: credential.user?.slice(0, 8),
        },
      });

      if (!credential.identityToken) {
        addLog("ERROR: No identity token!");
        throw new Error("No identity token received from Apple");
      }

      addLog("Calling signIn.social(apple)...");
      const result = await signIn.social({
        provider: "apple",
        idToken: {
          token: credential.identityToken,
        },
      });

      addLog(`signIn.social result: error=${result.error?.message || "none"}, hasUser=${!!result.data?.user}, keys=${result.data ? Object.keys(result.data).join(",") : "none"}`);
      Sentry.addBreadcrumb({
        category: "apple-auth",
        message: "signIn.social result",
        level: "info",
        data: {
          hasError: !!result.error,
          errorMessage: result.error?.message,
          hasData: !!result.data,
          hasUser: !!result.data?.user,
          dataKeys: result.data ? Object.keys(result.data) : [],
        },
      });

      if (result.error) {
        addLog(`ERROR from signIn.social: ${JSON.stringify(result.error)}`);
        Sentry.captureMessage("Apple Sign-In: signIn.social returned error", {
          level: "error",
          extra: { error: result.error },
        });
        setServerError(result.error.message || t("auth.appleSignInFailed"));
        return;
      }

      if (result.data?.user) {
        const session = await getSession();
        if (session.data?.session?.token) {
          await storeBearerToken(session.data.session.token);
        }
        addLog("Success! Navigating...");
        router.replace("/(tabs)");
      } else {
        addLog(`No user in result. data=${JSON.stringify(result.data)}`);
        Sentry.captureMessage("Apple Sign-In: no user in result.data", {
          level: "warning",
          extra: { resultData: result.data },
        });
      }
    } catch (err: any) {
      // Log ALL error properties — Apple errors may have extra fields
      const errProps: Record<string, unknown> = {};
      for (const key of Object.getOwnPropertyNames(err)) {
        try { errProps[key] = err[key]; } catch { /* ignore */ }
      }
      addLog(`CATCH raw: ${JSON.stringify(errProps)}`);
      addLog(`code=${err?.code}, name=${err?.name}, msg=${err?.message}`);

      // Always send to Sentry — "ERR_REQUEST_CANCELED" can also mean
      // Apple's "Sign Up Not Completed" failure, not just user cancel
      Sentry.captureException(err, {
        tags: { source: "apple-sign-in", errorCode: err?.code || "unknown" },
        extra: { ...errProps },
      });
      addLog("Sent to Sentry");

      if (err?.code !== "ERR_REQUEST_CANCELED") {
        const message = err?.message || t("auth.appleSignInFailed");
        setServerError(message);
      }
    }
  };

  const handleTestSentry = () => {
    addLog("Sending test event to Sentry...");
    Sentry.captureMessage("Test event from auth screen", { level: "info" });
    addLog("Sent! Check Sentry dashboard.");
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
            onPress={() => router.push("/(auth)/email-signin")}
            variant="outline"
            size="$5"
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

        {/* DEBUG: Sentry test + log box (temporary) */}
        <YStack gap="$2" alignSelf="stretch" marginTop="$4">
          <Button
            size="$3"
            variant="outline"
            onPress={handleTestSentry}
          >
            <Text fontSize="$2">Test Sentry</Text>
          </Button>
          {debugLogs.length > 0 && (
            <ScrollView
              style={{
                maxHeight: 200,
                backgroundColor: "#111",
                borderRadius: 8,
                padding: 8,
              }}
            >
              {debugLogs.map((log, i) => (
                <Text key={i} fontSize={11} color="#0f0" fontFamily="$mono">
                  {log}
                </Text>
              ))}
            </ScrollView>
          )}
        </YStack>
      </YStack>
    </Container>
  );
}
