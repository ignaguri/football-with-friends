// @ts-nocheck - Tamagui type recursion workaround
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithPhone } from "@repo/api-client";
import {
  Container,
  Card,
  Text,
  YStack,
  Input,
  Button,
  Spinner,
  PhoneInput,
} from "@repo/ui";
import { Link, router } from "expo-router";
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
      setServerError(err.message || t("auth.signInFailed"));
      console.error("Phone sign in error:", err);
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
              {t("auth.signInWithPhone")}
            </Text>
          </YStack>

          <Card variant="elevated" padding="$4">
            <YStack gap="$4">
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

              {serverError && (
                <Text color="$red10" fontSize="$3" textAlign="center">
                  {serverError}
                </Text>
              )}

              <YStack paddingTop="$4">
                <Button
                  onPress={phoneForm.handleSubmit(onSubmit)}
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
              <Link href="/(auth)/phone-signup" asChild>
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
