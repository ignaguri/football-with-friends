// @ts-nocheck - Tamagui type recursion workaround
import { zodResolver } from "@hookform/resolvers/zod";
import {
  signInWithPhone,
  needsPasswordReset,
  resetPasswordForMigration,
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
import { router } from "expo-router";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";

import {
  phoneSignInSchema,
  type PhoneSignInFormData,
} from "../../lib/validation";

export default function PhoneSignInScreen() {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const phoneForm = useForm<PhoneSignInFormData>({
    resolver: zodResolver(phoneSignInSchema),
    defaultValues: {
      phoneNumber: "",
      password: "",
    },
  });

  const onSubmit = async (data: PhoneSignInFormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      await signInWithPhone({
        phoneNumber: data.phoneNumber,
        password: data.password,
      });

      router.replace("/(tabs)");
    } catch (err: any) {
      // Check if user needs password reset (old scrypt hash)
      const needs = await needsPasswordReset({
        phoneNumber: data.phoneNumber,
      });
      if (needs) {
        setShowPasswordReset(true);
        setServerError(null);
      } else {
        setServerError(err.message || t("auth.signInFailed"));
      }
      console.error("Phone sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const phoneNumber = phoneForm.getValues("phoneNumber");

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
      // Pass the original password as proof of identity
      const currentPassword = phoneForm.getValues("password");
      await resetPasswordForMigration({ phoneNumber, currentPassword, newPassword });
      setResetSuccess(true);

      // Auto sign-in with the new password
      try {
        await signInWithPhone({ phoneNumber, password: newPassword });
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
          width="100%"
          maxWidth={400}
          marginHorizontal="auto"
          paddingVertical="$8"
        >
          <YStack gap="$2" alignItems="center">
            <Text fontSize="$9" fontWeight="bold">
              {t("auth.signIn")}
            </Text>
            <Text color="$gray11" textAlign="center">
              {t("auth.signInWithPhone")}
            </Text>
          </YStack>

          <Card variant="elevated" padding="$5" width="100%">
            <YStack gap="$4">
              {!showPasswordReset ? (
                <>
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
                            ? t(phoneForm.formState.errors.password.message as string)
                            : undefined
                        }
                      />
                    )}
                  />

                  <Text
                    color="$blue10"
                    fontSize="$3"
                    textAlign="right"
                    cursor="pointer"
                    onPress={() => router.push("/(auth)/forgot-password")}
                  >
                    {t("auth.forgotPassword")}
                  </Text>
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
                    onPress={phoneForm.handleSubmit(onSubmit)}
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

          <XStack gap="$1" justifyContent="center">
            <Text color="$gray11">{t("auth.noAccount")}</Text>
            <Text
              color="$blue10"
              fontWeight="600"
              cursor="pointer"
              onPress={() => router.push("/(auth)/phone-signup")}
            >
              {t("auth.signUpNow")}
            </Text>
          </XStack>
        </YStack>
      </ScrollView>
    </Container>
  );
}
