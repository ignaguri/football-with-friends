import { useState } from "react";
import { Container, Card, Text, YStack, Input, Button, Spinner } from "@repo/ui";
import { Link, router } from "expo-router";
import { signIn } from "@repo/api-client";
import { useTranslation } from "react-i18next";

export default function SignInScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError(t("auth.fillAllFields"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || t("auth.signInFailed"));
        return;
      }

      // Navigate to main app
      router.replace("/(tabs)");
    } catch (err) {
      setError(t("auth.unexpectedError"));
      console.error("Sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use full URL for callback - window.location.origin for web, or hardcoded for native
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:8081";
      await signIn.social({
        provider: "google",
        callbackURL: `${baseUrl}/(tabs)`,
      });
    } catch (err) {
      setError(t("auth.googleSignInFailed"));
      console.error("Google sign in error:", err);
    } finally {
      setIsLoading(false);
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

        <Card variant="elevated" padding="$4">
          <YStack space="$4">
            <Input
              label={t("auth.email")}
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={error && !email ? t("auth.emailRequired") : undefined}
            />

            <Input
              label={t("auth.password")}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={error && !password ? t("auth.passwordRequired") : undefined}
            />

            {error && (
              <Text color="$red10" fontSize="$3" textAlign="center">
                {error}
              </Text>
            )}

            <Button
              onPress={handleSignIn}
              disabled={isLoading}
              variant="primary"
            >
              {isLoading ? <Spinner size="small" /> : t("auth.signIn")}
            </Button>

            <YStack space="$3" alignItems="center">
              <Text color="$gray10" fontSize="$3">
                {t("auth.orContinueWith")}
              </Text>

              <Button
                onPress={handleGoogleSignIn}
                disabled={isLoading}
                variant="outline"
                width="100%"
              >
                {t("signin.signInWithGoogle")}
              </Button>
            </YStack>
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
