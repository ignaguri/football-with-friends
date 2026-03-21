// @ts-nocheck - Tamagui type recursion workaround
import { zodResolver } from "@hookform/resolvers/zod";
import {
  signIn,
  needsPasswordReset,
  resetPasswordForMigration,
} from "@repo/api-client";
import {
  Container,
  Card,
  Text,
  YStack,
  Input,
  Button,
  Spinner,
} from "@repo/ui";
import { Link, router } from "expo-router";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";

import {
  signInSchema,
  type SignInFormData,
} from "../../lib/validation";

export default function EmailSignInScreen() {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const emailForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        // Check if user needs password reset (old scrypt hash)
        const needs = await needsPasswordReset({ email: data.email });
        if (needs) {
          setShowPasswordReset(true);
          setServerError(null);
        } else {
          setServerError(result.error.message || t("auth.signInFailed"));
        }
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

  const handlePasswordReset = async () => {
    const email = emailForm.getValues("email");

    if (newPassword.length < 8) {
      setServerError(t("auth.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setServerError(t("auth.passwordMismatch"));
      return;
    }

    setIsLoading(true);
    setServerError(null);

    try {
      const currentPassword = emailForm.getValues("password");
      await resetPasswordForMigration({ email, currentPassword, newPassword });
      setResetSuccess(true);

      // Auto sign-in with the new password
      try {
        const result = await signIn.email({ email, password: newPassword });
        if (result.error) throw new Error(result.error.message);
        router.replace("/(tabs)");
      } catch {
        setResetSuccess(false);
        setShowPasswordReset(false);
        setServerError(t("auth.signInFailed"));
      }
    } catch (err: any) {
      setServerError(err.message || t("auth.passwordResetFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container variant="padded">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack
          gap="$6"
          justifyContent="center"
          maxWidth={400}
          marginHorizontal="auto"
          paddingVertical="$8"
        >
          <YStack gap="$2" alignItems="center">
            <Text fontSize="$9" fontWeight="bold">
              {t("auth.signIn")}
            </Text>
            <Text color="$gray11" textAlign="center">
              {t("auth.withYourEmail")}
            </Text>
          </YStack>

          <Card variant="elevated" padding="$4">
            <YStack gap="$4">
              {!showPasswordReset ? (
                <>
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
                            ? t(
                                emailForm.formState.errors.email
                                  .message as string,
                              )
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
                </>
              ) : (
                <>
                  {resetSuccess ? (
                    <Text
                      color="$green10"
                      fontSize="$3"
                      textAlign="center"
                      paddingVertical="$2"
                    >
                      {t("auth.passwordResetSuccess")}
                    </Text>
                  ) : (
                    <>
                      <Text
                        color="$orange10"
                        fontSize="$3"
                        textAlign="center"
                        paddingVertical="$2"
                      >
                        {t("auth.passwordResetRequired")}
                      </Text>

                      <Input
                        label={t("auth.createNewPassword")}
                        placeholder={t("auth.createNewPassword")}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                      />

                      <Input
                        label={t("auth.confirmNewPassword")}
                        placeholder={t("auth.confirmNewPassword")}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                      />
                    </>
                  )}
                </>
              )}

              {serverError && (
                <Text color="$red10" fontSize="$3" textAlign="center">
                  {serverError}
                </Text>
              )}

              <YStack paddingTop="$4">
                {!showPasswordReset ? (
                  <Button
                    onPress={emailForm.handleSubmit(onSubmit)}
                    disabled={isLoading}
                    variant="primary"
                  >
                    {isLoading ? <Spinner size="small" color="white" /> : t("auth.signIn")}
                  </Button>
                ) : !resetSuccess ? (
                  <Button
                    onPress={handlePasswordReset}
                    disabled={isLoading}
                    variant="primary"
                  >
                    {isLoading ? (
                      <Spinner size="small" color="white" />
                    ) : (
                      t("auth.resetMyPassword")
                    )}
                  </Button>
                ) : null}
              </YStack>
            </YStack>
          </Card>

          <YStack gap="$2" alignItems="center">
            <Text color="$gray11">
              {t("auth.noAccount")}{" "}
              <Link href="/(auth)/email-signup" asChild>
                <Text color="$blue10" fontWeight="600" cursor="pointer">
                  {t("auth.signUpNow")}
                </Text>
              </Link>
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </Container>
  );
}
