import { useState, useEffect } from "react";
import { Container, Card, Text, YStack, Input, Button, Spinner } from "@repo/ui";
import { Link, router } from "expo-router";
import { signUp, signIn, getSession, getConfiguredApiUrl } from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";

export default function SignUpScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Check session on mount - this handles the OAuth callback redirect
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session?.data?.user) {
          // User is already logged in, redirect to home
          router.replace("/(tabs)");
        }
      } catch (err) {
        // Not logged in, stay on sign-up page
      }
    };
    checkSession();
  }, []);

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      setError(t("auth.fillRequiredFields"));
      return;
    }

    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    if (username && (username.length < 3 || username.length > 20)) {
      setError(t("auth.usernameTooShort"));
      return;
    }

    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      setError(t("auth.usernameInvalid"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signUp.email({
        email,
        password,
        name,
        username: username || undefined,
      });

      if (result.error) {
        setError(result.error.message || t("auth.signUpFailed"));
        return;
      }

      router.replace("/(tabs)");
    } catch (err) {
      setError(t("auth.unexpectedError"));
      console.error("Sign up error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      if (Platform.OS === "web") {
        // On web, use direct fetch to API because the expo plugin uses expo-web-browser
        // which doesn't work in browser context
        const apiUrl = getConfiguredApiUrl();
        const response = await fetch(`${apiUrl}/api/auth/sign-in/social`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: "google",
            callbackURL: window.location.origin + "/",
          }),
          credentials: "include",
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          console.error("Google sign up error:", result.error || result);
          setError(result.error?.message || t("auth.googleSignInFailed"));
          return;
        }

        // Redirect to Google OAuth consent screen
        if (result.url) {
          window.location.href = result.url;
        } else {
          console.error("OAuth did not return redirect URL:", result);
          setError(t("auth.googleSignInFailed"));
        }
      } else {
        // On native, the expo plugin handles the OAuth flow via expo-web-browser
        const result = await signIn.social({
          provider: "google",
          callbackURL: "/",
        });

        if (result.error) {
          console.error("Google sign up error:", result.error);
          setError(result.error.message || t("auth.googleSignInFailed"));
          return;
        }

        router.replace("/(tabs)");
      }
    } catch (err) {
      setError(t("auth.googleSignInFailed"));
      console.error("Google sign up error:", err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Container variant="padded">
      <YStack space="$6" flex={1} justifyContent="center" maxWidth={400} marginHorizontal="auto">
        <YStack space="$2" alignItems="center">
          <Text fontSize="$9" fontWeight="bold">
            {t("auth.createAccount")}
          </Text>
          <Text color="$gray11" textAlign="center">
            {t("auth.signUpDescription")}
          </Text>
        </YStack>

        <Card variant="elevated" padding="$4">
          <YStack space="$4">
            <Input
              label={`${t("auth.name")} *`}
              placeholder={t("auth.namePlaceholder")}
              value={name}
              onChangeText={setName}
              error={error && !name ? t("auth.nameRequired") : undefined}
            />

            <Input
              label={`${t("auth.email")} *`}
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={error && !email ? t("auth.emailRequired") : undefined}
            />

            <Input
              label={`${t("auth.password")} *`}
              placeholder={t("auth.passwordMinLength")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={error && !password ? t("auth.passwordRequired") : undefined}
              helperText={t("auth.passwordHelp")}
            />

            <Input
              label={t("auth.username")}
              placeholder={t("auth.usernamePlaceholder")}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              helperText={t("auth.usernameHelp")}
            />

            {error && (
              <Text color="$red10" fontSize="$3" textAlign="center">
                {error}
              </Text>
            )}

            <Button
              onPress={handleSignUp}
              disabled={isLoading || isGoogleLoading}
              variant="primary"
            >
              {isLoading ? <Spinner size="small" /> : t("auth.signUp")}
            </Button>

            <YStack space="$3" alignItems="center">
              <Text color="$gray10" fontSize="$3">
                {t("auth.orContinueWith")}
              </Text>

              <Button
                onPress={handleGoogleSignUp}
                disabled={isLoading || isGoogleLoading}
                variant="outline"
                width="100%"
              >
                {isGoogleLoading ? <Spinner size="small" /> : t("signin.signInWithGoogle")}
              </Button>
            </YStack>
          </YStack>
        </Card>

        <YStack space="$2" alignItems="center">
          <Text color="$gray11">
            {t("auth.hasAccount")}{" "}
            <Link href="/(auth)/sign-in" asChild>
              <Text color="$blue10" fontWeight="600">
                {t("auth.signInLink")}
              </Text>
            </Link>
          </Text>
        </YStack>
      </YStack>
    </Container>
  );
}
