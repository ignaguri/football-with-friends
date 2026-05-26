// @ts-nocheck - Tamagui type recursion workaround
import {
  useApproveJoinRequest,
  useGroupJoinRequests,
  useRejectJoinRequest,
} from "@repo/api-client";
import { Container, Dialog, Input, RefreshableScrollView } from "@repo/ui";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";

export default function GroupJoinRequestsScreen() {
  const { t } = useTranslation();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { data: requests, isLoading, refetch } = useGroupJoinRequests(groupId, true);
  const approve = useApproveJoinRequest(groupId);
  const reject = useRejectJoinRequest(groupId);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (isLoading) {
    return (
      <Container variant="centered">
        <Spinner size="large" />
      </Container>
    );
  }

  // A single in-app modal collects the reason on every platform (Alert.prompt is
  // iOS-only, so it can't serve web/Android), and the reason stays required.
  function onReject(reqId: string) {
    setRejectReason("");
    setRejectingId(reqId);
  }

  async function confirmReject() {
    const reqId = rejectingId;
    if (!reqId || !rejectReason.trim()) return;
    try {
      await reject.mutateAsync({ reqId, reason: rejectReason.trim() });
      setRejectingId(null);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : t("groups.discover.error"));
    }
  }

  return (
    <Container>
      <RefreshableScrollView onRefresh={refetch}>
        <YStack padding="$4" gap="$3">
          {!requests || requests.length === 0 ? (
            <Text color="$gray11">{t("groups.joinRequests.queueEmpty")}</Text>
          ) : (
            requests.map((r) => (
              <YStack
                key={r.id}
                padding="$3"
                borderRadius="$4"
                backgroundColor="$gray2"
                borderWidth={1}
                borderColor="$gray5"
                gap="$2"
                testID={`join-request-card-${r.id}`}
              >
                <Text fontSize="$4">{r.requesterName || r.requesterPhone || r.requestedByUserId}</Text>
                {r.message ? (
                  <Text fontSize="$3" color="$gray11">
                    {r.message}
                  </Text>
                ) : null}
                <XStack gap="$2">
                  <Button
                    theme="green"
                    flex={1}
                    onPress={() =>
                      approve
                        .mutateAsync(r.id)
                        .catch((err) =>
                          Alert.alert(
                            "Error",
                            err instanceof Error ? err.message : t("groups.discover.error"),
                          ),
                        )
                    }
                    disabled={approve.isPending}
                    accessibilityRole="button"
                    testID={`join-request-approve-${r.id}`}
                  >
                    {t("groups.joinRequests.approve")}
                  </Button>
                  <Button
                    theme="red"
                    flex={1}
                    onPress={() => onReject(r.id)}
                    disabled={reject.isPending}
                    accessibilityRole="button"
                    testID={`join-request-reject-${r.id}`}
                  >
                    {t("groups.joinRequests.reject")}
                  </Button>
                </XStack>
              </YStack>
            ))
          )}
        </YStack>
      </RefreshableScrollView>

      <Dialog
        open={!!rejectingId}
        onOpenChange={(open) => !open && setRejectingId(null)}
        title={t("groups.joinRequests.rejectPrompt")}
        confirmText={reject.isPending ? <Spinner /> : t("groups.joinRequests.reject")}
        cancelText={t("shared.cancel")}
        onConfirm={confirmReject}
        onCancel={() => setRejectingId(null)}
      >
        <YStack gap="$3" padding="$4">
          <Input
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder={t("groups.joinRequests.rejectPrompt")}
            testID="join-request-reject-reason"
            autoFocus
          />
        </YStack>
      </Dialog>
    </Container>
  );
}
