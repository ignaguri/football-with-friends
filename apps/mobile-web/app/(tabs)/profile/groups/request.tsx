// @ts-nocheck - Tamagui type recursion workaround
import {
  useCancelGroupRequest,
  useMyGroupRequests,
  useSubmitGroupRequest,
} from "@repo/api-client";
import { Container } from "@repo/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Button, Input, Spinner, Text, TextArea, YStack } from "tamagui";

export default function RequestGroupScreen() {
  const { t } = useTranslation();
  const { data: requests, isLoading } = useMyGroupRequests();
  const submit = useSubmitGroupRequest();
  const cancel = useCancelGroupRequest();
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");

  if (isLoading) {
    return (
      <Container variant="centered">
        <Spinner size="large" />
      </Container>
    );
  }

  const pending = requests?.find((r) => r.status === "pending");
  const lastDecided = requests?.find((r) => r.status === "approved" || r.status === "rejected");

  async function onSubmit() {
    if (!name.trim() || !reason.trim()) return;
    try {
      await submit.mutateAsync({ name: name.trim(), reason: reason.trim() });
      setName("");
      setReason("");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : t("groups.requests.error"));
    }
  }

  async function onCancel(id: string) {
    try {
      await cancel.mutateAsync(id);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : t("groups.requests.error"));
    }
  }

  if (pending) {
    return (
      <YStack flex={1} padding="$4" gap="$3">
        <Text fontSize="$5" fontWeight="600">
          {pending.name}
        </Text>
        <Text color="$gray11">{t("groups.requests.pending")}</Text>
        <Button
          theme="red"
          onPress={() => onCancel(pending.id)}
          disabled={cancel.isPending}
          accessibilityRole="button"
          testID="group-request-cancel"
        >
          {cancel.isPending ? <Spinner /> : t("groups.requests.cancel")}
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} padding="$4" gap="$3">
      {lastDecided?.status === "rejected" ? (
        <Text color="$red11">
          {t("groups.requests.rejected", { reason: lastDecided.decisionReason ?? "" })}
        </Text>
      ) : null}

      {lastDecided ? <Text fontSize="$5" fontWeight="600">{t("groups.requests.resubmit")}</Text> : null}
      <Text fontSize="$4">{t("groups.requests.nameLabel")}</Text>
      <Input
        value={name}
        onChangeText={setName}
        placeholder={t("groups.requests.namePlaceholder")}
        testID="group-request-name"
        autoFocus
      />
      <Text fontSize="$4">{t("groups.requests.reasonLabel")}</Text>
      <TextArea
        value={reason}
        onChangeText={setReason}
        placeholder={t("groups.requests.reasonPlaceholder")}
        testID="group-request-reason"
        numberOfLines={4}
      />
      <Button
        theme="blue"
        onPress={onSubmit}
        disabled={!name.trim() || !reason.trim() || submit.isPending}
        accessibilityRole="button"
        testID="group-request-submit"
      >
        {submit.isPending ? <Spinner /> : t("groups.requests.submit")}
      </Button>
    </YStack>
  );
}
