import { zodResolver } from "@hookform/resolvers/zod";
import {
  signUp,
  signIn,
  getSession,
  getConfiguredApiUrl,
  signUpWithPhone,
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
  signUpSchema,
  phoneSignUpSchema,
  type SignUpFormData,
  type PhoneSignUpFormData,
} from "../../lib/validation";

type AuthMethod = "email" | "phone";

export default function SignUpScreen() {
  const { t } = useTranslation();
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Email form
  const emailForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      username: "",
    },
  });

  // Phone form
  const phoneForm = useForm<PhoneSignUpFormData>({
    resolver: zodResolver(phoneSignUpSchema),
    defaultValues: {
      name: "",
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
        // Not logged in, stay on sign-up page
      }
    };
    checkSession();
  }, []);

  const onEmailSubmit = async (data: SignUpFormData) => {
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

  const onPhoneSubmit = async (data: PhoneSignUpFormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      await signUpWithPhone({
        phoneNumber: data.phoneNumber,
        password: data.password,
        name: data.name,
      });

      router.replace("/(tabs)");
    } catch (err: any) {
      setServerError(err.message || t("auth.signUpFailed"));
      console.error("Phone sign up error:", err);
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
        gap="$6"
        flex={1}
        justifyContent="center"
        maxWidth={400}
        marginHorizontal="auto"
      >
        <YStack gap="$2" alignItems="center">
          <Text fontSize="$9" fontWeight="bold">
            {t("auth.createAccount")}
          </Text>
          <Text color="$gray11" textAlign="center">
            {t("auth.signUpDescription")}
          </Text>
        </YStack>

        {/* Auth Method Toggle */}
        <XStack justifyContent="center" gap="$2">
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

        {/* Email Sign Up Form */}
        {authMethod === "email" && (
          <Card variant="elevated" padding="$4">
            <YStack gap="$4">
              <Controller
                control={emailForm.control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={`${t("auth.name")} *`}
                    placeholder={t("auth.namePlaceholder")}
                    value={value}
                    onChangeText={onChange}
                    error={
                      emailForm.formState.errors.name
                        ? t(emailForm.formState.errors.name.message as string)
                        : undefined
                    }
                  />
                )}
              />

              <Controller
                control={emailForm.control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={`${t("auth.email")} *`}
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
                    label={`${t("auth.password")} *`}
                    placeholder={t("auth.passwordMinLength")}
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
                    helperText={t("auth.passwordHelp")}
                  />
                )}
              />

              <Controller
                control={emailForm.control}
                name="username"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t("auth.username")}
                    placeholder={t("auth.usernamePlaceholder")}
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    helperText={t("auth.usernameHelp")}
                    error={
                      emailForm.formState.errors.username
                        ? t(
                            emailForm.formState.errors.username
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
                  {isLoading ? <Spinner size="small" /> : t("auth.signUp")}
                </Button>
              </YStack>

              <YStack gap="$3" alignItems="center">
                <Text color="$gray10" fontSize="$3">
                  {t("auth.orContinueWith")}
                </Text>

                <Button
                  onPress={handleGoogleSignUp}
                  disabled={isLoading || isGoogleLoading}
                  variant="outline"
                  width="100%"
                >
                  {isGoogleLoading ? (
                    <Spinner size="small" />
                  ) : (
                    t("signin.signInWithGoogle")
                  )}
                </Button>
              </YStack>
            </YStack>
          </Card>
        )}

        {/* Phone Sign Up Form */}
        {authMethod === "phone" && (
          <Card variant="elevated" padding="$4">
            <YStack gap="$4">
              <Controller
                control={phoneForm.control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={`${t("auth.name")} *`}
                    placeholder={t("auth.namePlaceholder")}
                    value={value}
                    onChangeText={onChange}
                    error={
                      phoneForm.formState.errors.name
                        ? t(phoneForm.formState.errors.name.message as string)
                        : undefined
                    }
                  />
                )}
              />

              <Controller
                control={phoneForm.control}
                name="phoneNumber"
                render={({ field: { onChange, value } }) => (
                  <PhoneInput
                    label={`${t("auth.phone")} *`}
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
                    helperText={t("auth.phoneHelp")}
                  />
                )}
              />

              <Controller
                control={phoneForm.control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={`${t("auth.password")} *`}
                    placeholder={t("auth.passwordMinLength")}
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
                    helperText={t("auth.passwordHelp")}
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
                  {isLoading ? <Spinner size="small" /> : t("auth.signUp")}
                </Button>
              </YStack>

              <YStack gap="$3" alignItems="center">
                <Text color="$gray10" fontSize="$3">
                  {t("auth.orContinueWith")}
                </Text>

                <Button
                  onPress={handleGoogleSignUp}
                  disabled={isLoading || isGoogleLoading}
                  variant="outline"
                  width="100%"
                >
                  {isGoogleLoading ? (
                    <Spinner size="small" />
                  ) : (
                    t("signin.signInWithGoogle")
                  )}
                </Button>
              </YStack>
            </YStack>
          </Card>
        )}

        <YStack gap="$2" alignItems="center">
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
