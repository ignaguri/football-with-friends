// @ts-nocheck - Tamagui type recursion workaround
import {
  requestPasswordReset,
  resetPasswordWithCode,
  signInWithPhone,
  signIn,
  getOrganizerContact,
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
  Image,
} from "@repo/ui";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, ScrollView } from "react-native";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [organizerWhatsapp, setOrganizerWhatsapp] = useState<string | null>(
    null,
  );

  useEffect(() => {
    getOrganizerContact().then(setOrganizerWhatsapp);
  }, []);

  const isPhone = identifier.startsWith("+") || /^\d/.test(identifier);

  const handleRequestCode = async () => {
    if (!identifier.trim()) {
      setServerError(t("auth.enterIdentifier"));
      return;
    }

    setIsLoading(true);
    setServerError(null);

    try {
      await requestPasswordReset(
        isPhone
          ? { phoneNumber: identifier.trim() }
          : { email: identifier.trim() },
      );
      setStep("verify");
    } catch (err: any) {
      setServerError(err.message || t("auth.unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (code.length !== 6) {
      setServerError(t("auth.invalidResetCode"));
      return;
    }
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
      await resetPasswordWithCode({
        ...(isPhone
          ? { phoneNumber: identifier.trim() }
          : { email: identifier.trim() }),
        code,
        newPassword,
      });

      // Auto sign-in
      try {
        if (isPhone) {
          await signInWithPhone({
            phoneNumber: identifier.trim(),
            password: newPassword,
          });
        } else {
          await signIn.email({
            email: identifier.trim(),
            password: newPassword,
          });
        }
        router.replace("/(tabs)");
      } catch {
        // If auto sign-in fails, redirect to the appropriate signin screen
        router.replace(
          isPhone ? "/(auth)/phone-signin" : "/(auth)/email-signin",
        );
      }
    } catch (err: any) {
      setServerError(err.message || t("auth.invalidResetCode"));
    } finally {
      setIsLoading(false);
    }
  };

  const openWhatsApp = () => {
    if (!organizerWhatsapp) return;
    const message = encodeURIComponent(
      "Hi, I need my password reset code for Football con los pibes",
    );
    Linking.openURL(`https://wa.me/${organizerWhatsapp}?text=${message}`);
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
              {t("auth.forgotPasswordTitle")}
            </Text>
            <Text color="$gray11" textAlign="center">
              {step === "request"
                ? t("auth.forgotPasswordDescription")
                : t("auth.contactOrganizerForCode")}
            </Text>
          </YStack>

          <Card variant="elevated" padding="$5" width="100%">
            <YStack gap="$4">
              {step === "request" ? (
                <>
                  <Input
                    label={t("auth.phoneOrEmail")}
                    placeholder="+49... / email@example.com"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </>
              ) : (
                <>
                  {/* WhatsApp contact button */}
                  {organizerWhatsapp && (
                    <Button
                      onPress={openWhatsApp}
                      variant="outline"
                      size="$4"
                    >
                      <XStack
                        gap="$2"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Image
                          source={require("../../assets/whatsapp-logo.svg")}
                          style={{ width: 20, height: 20 }}
                          tintColor="#25D366"
                        />
                        <Text fontSize="$4" fontFamily="$body">
                          {t("auth.contactOrganizer")}
                        </Text>
                      </XStack>
                    </Button>
                  )}

                  <Input
                    label={t("auth.enterResetCode")}
                    placeholder={t("auth.resetCodePlaceholder")}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />

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

              {serverError && (
                <Text color="$red10" fontSize="$3" textAlign="center">
                  {serverError}
                </Text>
              )}

              <YStack paddingTop="$4">
                <Button
                  onPress={
                    step === "request" ? handleRequestCode : handleResetPassword
                  }
                  disabled={isLoading}
                  variant="primary"
                >
                  {isLoading ? (
                    <Spinner size="small" color="white" />
                  ) : step === "request" ? (
                    t("auth.requestResetCode")
                  ) : (
                    t("auth.resetPassword")
                  )}
                </Button>
              </YStack>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </Container>
  );
}
