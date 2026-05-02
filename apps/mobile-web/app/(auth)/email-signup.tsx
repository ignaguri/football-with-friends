// @ts-nocheck - Tamagui type recursion workaround
import { zodResolver } from "@hookform/resolvers/zod";
import { signUp } from "@repo/api-client";
import { Container, Card, Text, YStack, XStack, Input, Button, Spinner } from "@repo/ui";
import { router } from "expo-router";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";

import { signUpSchema, type SignUpFormData } from "../../lib/validation";

export default function EmailSignUpScreen() {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const emailForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      username: "",
    },
  });

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

  return (
    <Container variant="padded">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <YStack gap="$6" width="100%" maxWidth={400} marginHorizontal="auto" paddingVertical="$8">
          <YStack gap="$2" alignItems="center">
            <Text fontSize="$9" fontWeight="bold">
              {t("auth.createAccount")}
            </Text>
            <Text color="$gray11" textAlign="center">
              {t("auth.withYourEmail")}
            </Text>
          </YStack>

          <Card variant="elevated" padding="$5" width="100%">
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
                    testID="auth-email-signup-name"
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
                    testID="auth-email-signup-email"
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
                    testID="auth-email-signup-password"
                    error={
                      emailForm.formState.errors.password
                        ? t(emailForm.formState.errors.password.message as string)
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
                    testID="auth-email-signup-username"
                    error={
                      emailForm.formState.errors.username
                        ? t(emailForm.formState.errors.username.message as string)
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
                  onPress={emailForm.handleSubmit(onSubmit)}
                  disabled={isLoading}
                  variant="primary"
                  testID="auth-email-signup-submit"
                >
                  {isLoading ? <Spinner size="small" /> : t("auth.signUp")}
                </Button>
              </YStack>
            </YStack>
          </Card>

          <XStack gap="$1" justifyContent="center">
            <Text color="$gray11">{t("auth.hasAccount")}</Text>
            <Text
              color="$blue10"
              fontWeight="600"
              cursor="pointer"
              onPress={() => router.push("/(auth)/email-signin")}
            >
              {t("auth.signInLink")}
            </Text>
          </XStack>
        </YStack>
      </ScrollView>
    </Container>
  );
}
