// @ts-nocheck - Tamagui type recursion workaround
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpWithPhone } from "@repo/api-client";
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
  phoneSignUpSchema,
  type PhoneSignUpFormData,
} from "../../lib/validation";

export default function PhoneSignUpScreen() {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const phoneForm = useForm<PhoneSignUpFormData>({
    resolver: zodResolver(phoneSignUpSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      password: "",
    },
  });

  const getPhoneErrorMessage = (error: any): string => {
    const message = error.message || "";

    if (message.includes("not a function")) {
      return t("auth.serviceUnavailable");
    }
    if (message.includes("already registered")) {
      return t("auth.phoneAlreadyRegistered");
    }
    if (message.includes("invalid phone")) {
      return t("auth.invalidPhone");
    }

    return t("auth.signUpFailed");
  };

  const onSubmit = async (data: PhoneSignUpFormData) => {
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
      setServerError(getPhoneErrorMessage(err));
      console.error("Phone sign up error:", err);
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
              {t("auth.createAccount")}
            </Text>
            <Text color="$gray11" textAlign="center">
              {t("auth.signInWithPhone")}
            </Text>
          </YStack>

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
                  onPress={phoneForm.handleSubmit(onSubmit)}
                  disabled={isLoading}
                  variant="primary"
                >
                  {isLoading ? <Spinner size="small" /> : t("auth.signUp")}
                </Button>
              </YStack>
            </YStack>
          </Card>

          <YStack gap="$2" alignItems="center">
            <Text color="$gray11">
              {t("auth.hasAccount")}{" "}
              <Link href="/(auth)/phone-signin" asChild>
                <Text color="$blue10" fontWeight="600" cursor="pointer">
                  {t("auth.signInLink")}
                </Text>
              </Link>
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </Container>
  );
}
