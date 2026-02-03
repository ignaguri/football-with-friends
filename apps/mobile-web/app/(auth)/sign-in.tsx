import { zodResolver } from "@hookform/resolvers/zod";
import {
  signIn,
  getSession,
  getConfiguredApiUrl,
  signInWithPhone,
} from "@repo/api-client";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Input,
  Button,
  Spinner,
  PhoneInput,
} from "@repo/ui";
import { Link, router } from "expo-router";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Platform, Pressable } from "react-native";

import {
  signInSchema,
  phoneSignInSchema,
  type SignInFormData,
  type PhoneSignInFormData,
} from "../../lib/validation";

type AuthMethod = "email" | "phone";

export default function SignInScreen() {
  const { t } = useTranslation();
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Email form
  const emailForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Phone form
  const phoneForm = useForm<PhoneSignInFormData>({
    resolver: zodResolver(phoneSignInSchema),
    defaultValues: {
      phoneNumber: "",
      password: "",
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
        // Not logged in, stay on sign-in page
      }
    };
    checkSession();
  }, []);

  const onEmailSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        setServerError(result.error.message || t("auth.signInFailed"));
        return;
      }

      router.replace("/(tabs)");
    } catch (err) {
      setServerError(t("auth.unexpectedError"));
      console.error("Sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const onPhoneSubmit = async (data: PhoneSignInFormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      await signInWithPhone({
        phoneNumber: data.phoneNumber,
        password: data.password,
      });

      router.replace("/(tabs)");
    } catch (err: any) {
      setServerError(err.message || t("auth.signInFailed"));
      console.error("Phone sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setServerError(null);

    try {
      if (Platform.OS === "web") {
        // On web, use direct API URL so cookies are set on the same domain
        // as the OAuth callback. Cross-origin cookies with SameSite=None should work.
        const apiUrl = getConfiguredApiUrl();
        // Route OAuth callback through CF Workers web-callback endpoint
        // This solves cross-domain cookies: after OAuth, CF Workers reads the session
        // cookie (same domain) and redirects to Vercel with the token in the URL
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

  const switchToEmail = () => {
    setAuthMethod("email");
    setServerError(null);
  };

  const switchToPhone = () => {
    setAuthMethod("phone");
    setServerError(null);
  };

  return (
    <Container variant="padded">
      <YStack
        space="$6"
        flex={1}
        justifyContent="center"
        maxWidth={400}
        marginHorizontal="auto"
      >
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
          {isGoogleLoading ? (
            <Spinner size="small" />
          ) : (
            t("signin.signInWithGoogle")
          )}
        </Button>

        {/* Divider */}
        <XStack space="$3" alignItems="center">
          <YStack flex={1} height={1} backgroundColor="$gray6" />
          <Text color="$gray10" fontSize="$3">
            {t("auth.orContinueWith")}
          </Text>
          <YStack flex={1} height={1} backgroundColor="$gray6" />
        </XStack>

        {/* Auth Method Toggle */}
        <XStack justifyContent="center" space="$2">
          <Pressable onPress={switchToEmail}>
            <Text
              color={authMethod === "email" ? "$blue10" : "$gray10"}
              fontWeight={authMethod === "email" ? "600" : "400"}
              paddingHorizontal="$3"
              paddingVertical="$2"
            >
              {t("auth.useEmail")}
            </Text>
          </Pressable>
          <Text color="$gray6">|</Text>
          <Pressable onPress={switchToPhone}>
            <Text
              color={authMethod === "phone" ? "$blue10" : "$gray10"}
              fontWeight={authMethod === "phone" ? "600" : "400"}
              paddingHorizontal="$3"
              paddingVertical="$2"
            >
              {t("auth.usePhone")}
            </Text>
          </Pressable>
        </XStack>

        {/* Email/Password Sign In */}
        {authMethod === "email" && (
          <Card variant="elevated" padding="$4">
            <YStack space="$4">
              <Controller
                control={emailForm.control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t("auth.email")}
                    placeholder={t("auth.emailPlaceholder")}
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    error={
                      emailForm.formState.errors.email
                        ? t(emailForm.formState.errors.email.message as string)
                        : undefined
                    }
                  />
                )}
              />

              <Controller
                control={emailForm.control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t("auth.password")}
                    placeholder={t("auth.passwordPlaceholder")}
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry
                    error={
                      emailForm.formState.errors.password
                        ? t(
                            emailForm.formState.errors.password
                              .message as string,
                          )
                        : undefined
                    }
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
                  onPress={emailForm.handleSubmit(onEmailSubmit)}
                  disabled={isLoading || isGoogleLoading}
                  variant="primary"
                >
                  {isLoading ? <Spinner size="small" /> : t("auth.signIn")}
                </Button>
              </YStack>
            </YStack>
          </Card>
        )}

        {/* Phone/Password Sign In */}
        {authMethod === "phone" && (
          <Card variant="elevated" padding="$4">
            <YStack space="$4">
              <Controller
                control={phoneForm.control}
                name="phoneNumber"
                render={({ field: { onChange, value } }) => (
                  <PhoneInput
                    label={t("auth.phone")}
                    placeholder={t("auth.phonePlaceholder")}
                    value={value}
                    onChangeValue={(phone) => onChange(phone)}
                    error={
                      phoneForm.formState.errors.phoneNumber
                        ? t(
                            phoneForm.formState.errors.phoneNumber
                              .message as string,
                          )
                        : undefined
                    }
                  />
                )}
              />

              <Controller
                control={phoneForm.control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t("auth.password")}
                    placeholder={t("auth.passwordPlaceholder")}
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry
                    error={
                      phoneForm.formState.errors.password
                        ? t(
                            phoneForm.formState.errors.password
                              .message as string,
                          )
                        : undefined
                    }
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
                  onPress={phoneForm.handleSubmit(onPhoneSubmit)}
                  disabled={isLoading || isGoogleLoading}
                  variant="primary"
                >
                  {isLoading ? <Spinner size="small" /> : t("auth.signIn")}
                </Button>
              </YStack>
            </YStack>
          </Card>
        )}

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
