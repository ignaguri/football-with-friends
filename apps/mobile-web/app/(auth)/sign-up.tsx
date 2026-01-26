import { useState, useEffect } from "react";
import { Container, Card, Text, YStack, Input, Button, Spinner } from "@repo/ui";
import { Link, router } from "expo-router";
import { signUp, signIn, getSession, getConfiguredApiUrl } from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpFormData } from "../../lib/validation";

export default function SignUpScreen() {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      username: "",
    },
  });

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

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const result = await signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
        username: data.username || undefined,
      });

      if (result.error) {
        setServerError(result.error.message || t("auth.signUpFailed"));
        return;
      }

      router.replace("/(tabs)");
    } catch (err) {
      setServerError(t("auth.unexpectedError"));
      console.error("Sign up error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setServerError(null);

    try {
      if (Platform.OS === "web") {
        // On web, use direct API URL so cookies are set on the same domain
        // as the OAuth callback. Cross-origin cookies with SameSite=None should work.
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
          setServerError(result.error?.message || t("auth.googleSignInFailed"));
          return;
        }

        // Redirect to Google OAuth consent screen
        if (result.url) {
          window.location.href = result.url;
        } else {
          console.error("OAuth did not return redirect URL:", result);
          setServerError(t("auth.googleSignInFailed"));
        }
      } else {
        // On native, the expo plugin handles the OAuth flow via expo-web-browser
        const result = await signIn.social({
          provider: "google",
          callbackURL: "/",
        });

        if (result.error) {
          console.error("Google sign up error:", result.error);
          setServerError(result.error.message || t("auth.googleSignInFailed"));
          return;
        }

        router.replace("/(tabs)");
      }
    } catch (err) {
      setServerError(t("auth.googleSignInFailed"));
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
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={`${t("auth.name")} *`}
                  placeholder={t("auth.namePlaceholder")}
                  value={value}
                  onChangeText={onChange}
                  error={errors.name ? t(errors.name.message as string) : undefined}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={`${t("auth.email")} *`}
                  placeholder={t("auth.emailPlaceholder")}
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  error={errors.email ? t(errors.email.message as string) : undefined}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={`${t("auth.password")} *`}
                  placeholder={t("auth.passwordMinLength")}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  error={errors.password ? t(errors.password.message as string) : undefined}
                  helperText={t("auth.passwordHelp")}
                />
              )}
            />

            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t("auth.username")}
                  placeholder={t("auth.usernamePlaceholder")}
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  helperText={t("auth.usernameHelp")}
                  error={errors.username ? t(errors.username.message as string) : undefined}
                />
              )}
            />

            {serverError && (
              <Text color="$red10" fontSize="$3" textAlign="center">
                {serverError}
              </Text>
            )}

            <YStack paddingTop="$4">
              <Button
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading || isGoogleLoading}
                variant="primary"
              >
                {isLoading ? <Spinner size="small" /> : t("auth.signUp")}
              </Button>
            </YStack>

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
