// @ts-nocheck - Tamagui type recursion workaround
import { useCancelGroupRequest, useMyGroupRequests } from "@repo/api-client";
import { Button, Container, Spinner, Text, YStack } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

import {
  GroupRequestFields,
  GroupRequestPendingCard,
  useGroupRequestForm,
} from "@/components/group-request-form";

export default function RequestGroupScreen() {
  const { t } = useTranslation();
  const { data: requests, isLoading } = useMyGroupRequests();
  const cancel = useCancelGroupRequest();
  const requestForm = useGroupRequestForm();

  if (isLoading) {
    return (
      <Container variant="centered">
        <Spinner size="large" />
      </Container>
    );
  }

  const pending = requests?.find((r) => r.status === "pending");
  const lastDecided = requests?.find((r) => r.status === "approved" || r.status === "rejected");

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
        <GroupRequestPendingCard
          name={pending.name}
          pendingLabel={t("groups.requests.pending")}
          actions={
            <Button
              variant="danger"
              onPress={() => onCancel(pending.id)}
              disabled={cancel.isPending}
              testID="group-request-cancel"
            >
              {cancel.isPending ? <Spinner /> : t("groups.requests.cancel")}
            </Button>
          }
        />
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

      {lastDecided ? (
        <Text fontSize="$5" fontWeight="600">
          {t("groups.requests.resubmit")}
        </Text>
      ) : null}

      <GroupRequestFields
        form={requestForm}
        testIDPrefix="group-request"
        nameLabel={t("groups.requests.nameLabel")}
        namePlaceholder={t("groups.requests.namePlaceholder")}
        reasonLabel={t("groups.requests.reasonLabel")}
        reasonPlaceholder={t("groups.requests.reasonPlaceholder")}
        submitContent={requestForm.isSubmitting ? <Spinner /> : t("groups.requests.submit")}
        multilineReason
        autoFocusName
      />
    </YStack>
  );
}
