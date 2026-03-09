// @ts-nocheck - Tamagui type recursion workaround
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "@repo/api-client";
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
                >
                  {isLoading ? <Spinner size="small" color="white" /> : t("auth.signIn")}
                </Button>
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
