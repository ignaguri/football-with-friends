import { useState } from "react";
import { Container, Card, Text, YStack, XStack, Input, Button, Spinner } from "@repo/ui";
import { Link, router } from "expo-router";
import { signIn } from "@repo/api-client";
import { useTranslation } from "react-i18next";

export default function SignInScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      setEmailError(t("auth.fillAllFields"));
      return;
    }

    setIsLoading(true);
    setEmailError(null);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setEmailError(result.error.message || t("auth.signInFailed"));
        return;
      }

      router.replace("/(tabs)");
    } catch (err) {
      setEmailError(t("auth.unexpectedError"));
      console.error("Sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setEmailError(null);

    try {
      // On web, bypass the expo plugin and make a direct API call
      // The expo plugin uses expo-web-browser which doesn't work on web
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";
      const callbackURL = window.location.origin + "/";

      const response = await fetch(`${apiUrl}/api/auth/sign-in/social`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          provider: "google",
          callbackURL,
          disableRedirect: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Google sign in error:", errorData);
        setEmailError(errorData.message || t("auth.googleSignInFailed"));
        return;
      }

      const data = await response.json();

      if (data.url) {
        // Redirect to Google OAuth
        window.location.assign(data.url);
        return;
      } else {
        console.error("No OAuth URL returned:", data);
        setEmailError(t("auth.googleSignInFailed"));
      }
    } catch (err) {
      console.error("Google sign in error:", err);
      setEmailError(t("auth.googleSignInFailed"));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Container variant="padded">
      <YStack space="$6" flex={1} justifyContent="center" maxWidth={400} marginHorizontal="auto">
        <YStack space="$2" alignItems="center">
          <Text fontSize="$9" fontWeight="bold">
            {t("auth.welcomeBack")}
          </Text>
          <Text color="$gray11" textAlign="center">
            {t("auth.signInDescription")}
          </Text>
        </YStack>

        {/* Google Sign In - Primary Action */}
        <Button
          variant="outline"
          size="$5"
          onPress={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
          opacity={isGoogleLoading || isLoading ? 0.5 : 1}
        >
          {isGoogleLoading ? <Spinner size="small" /> : t("signin.signInWithGoogle")}
        </Button>

        {/* Divider */}
        <XStack space="$3" alignItems="center">
          <YStack flex={1} height={1} backgroundColor="$gray6" />
          <Text color="$gray10" fontSize="$3">
            {t("auth.orContinueWith")}
          </Text>
          <YStack flex={1} height={1} backgroundColor="$gray6" />
        </XStack>

        {/* Email/Password Sign In */}
        <Card variant="elevated" padding="$4">
          <YStack space="$4">
            <Input
              label={t("auth.email")}
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={emailError && !email ? t("auth.emailRequired") : undefined}
            />

            <Input
              label={t("auth.password")}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={emailError && !password ? t("auth.passwordRequired") : undefined}
            />

            {emailError && (
              <Text color="$red10" fontSize="$3" textAlign="center">
                {emailError}
              </Text>
            )}

            <Button
              onPress={handleSignIn}
              disabled={isLoading || isGoogleLoading}
              variant="primary"
            >
              {isLoading ? <Spinner size="small" /> : t("auth.signIn")}
            </Button>
          </YStack>
        </Card>

        <YStack space="$2" alignItems="center">
          <Text color="$gray11">
            {t("auth.noAccount")}{" "}
            <Link href="/(auth)/sign-up" asChild>
              <Text color="$blue10" fontWeight="600">
                {t("auth.signUpLink")}
              </Text>
            </Link>
          </Text>
        </YStack>
      </YStack>
    </Container>
  );
}
