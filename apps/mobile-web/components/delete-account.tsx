// @ts-nocheck - Tamagui type recursion workaround
import { signOut, deleteAccount } from "@repo/api-client";
import { YStack, XStack, Text, Button, Input, Spinner } from "@repo/ui";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface DeleteAccountSectionProps {
  primaryAuthMethod: string;
}

export function DeleteAccountSection({ primaryAuthMethod }: DeleteAccountSectionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const expectedWord = t("profile.deleteConfirmWord");
    if (confirmText.toUpperCase() !== expectedWord.toUpperCase()) {
      setError(t("profile.deleteAccountConfirm"));
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      try {
        const { unregisterPushToken } = await import("../lib/use-push-notifications");
        await unregisterPushToken();
      } catch {}

      await deleteAccount(confirmText, password || undefined);
      await signOut();
      router.replace("/(auth)");
    } catch (err: any) {
      setError(err.message || t("profile.deleteAccountFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setConfirmText("");
    setPassword("");
    setError(null);
  };

  const needsPassword = primaryAuthMethod !== "google" && primaryAuthMethod !== "apple";

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        onPress={() => setIsExpanded(true)}
        marginTop="$2"
        color="$red10"
        borderColor="$red7"
      >
        {t("profile.deleteAccount")}
      </Button>
    );
  }

  return (
    <YStack gap="$3" marginTop="$3" paddingTop="$3" borderTopWidth={1} borderTopColor="$red5">
      <Text color="$red10" fontSize="$3" fontWeight="600">
        {t("profile.deleteAccountTitle")}
      </Text>
      <Text color="$red9" fontSize="$2">
        {t("profile.deleteAccountWarning")}
      </Text>

      <Input
        label={t("profile.deleteAccountConfirm")}
        placeholder={t("profile.deleteConfirmWord")}
        value={confirmText}
        onChangeText={setConfirmText}
        autoCapitalize="characters"
      />

      {needsPassword && (
        <Input
          label={t("auth.password")}
          placeholder={t("auth.passwordPlaceholder")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      )}

      {error && (
        <Text color="$red10" fontSize="$3">
          {error}
        </Text>
      )}

      <XStack gap="$2">
        <Button
          flex={1}
          variant="outline"
          onPress={handleCancel}
          disabled={isDeleting}
        >
          {t("shared.cancel")}
        </Button>
        <Button
          flex={1}
          variant="danger"
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? <Spinner size="small" /> : t("profile.deleteAccount")}
        </Button>
      </XStack>
    </YStack>
  );
}
