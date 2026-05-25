// @ts-nocheck - Tamagui type recursion workaround
import {
  useApproveGroupRequest,
  usePendingGroupRequests,
  useRejectGroupRequest,
  useSession,
} from "@repo/api-client";
import { Container, RefreshableScrollView } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";

export default function GroupRequestsScreen() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const { data: requests, isLoading, refetch } = usePendingGroupRequests(isAdmin);
  const approve = useApproveGroupRequest();
  const reject = useRejectGroupRequest();

  if (!isAdmin) {
    return (
      <Container variant="centered">
        <Text color="$gray11">{t("groups.create.adminOnly")}</Text>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container variant="centered">
        <Spinner size="large" />
      </Container>
    );
  }

  async function onApprove(id: string) {
    try {
      await approve.mutateAsync(id);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : t("groups.requests.error"));
    }
  }

  function onReject(id: string) {
    // Alert.prompt is iOS-only; on Android fall back to a fixed reason. The
    // dedicated reject screen can replace this if multi-platform input is needed.
    if (Alert.prompt) {
      Alert.prompt(t("groups.requests.rejectPrompt"), undefined, async (reason) => {
        if (!reason?.trim()) return;
        try {
          await reject.mutateAsync({ id, reason: reason.trim() });
        } catch (err) {
          Alert.alert("Error", err instanceof Error ? err.message : t("groups.requests.error"));
        }
      });
    } else {
      reject
        .mutateAsync({ id, reason: "Declined by admin" })
        .catch((err) =>
          Alert.alert("Error", err instanceof Error ? err.message : t("groups.requests.error")),
        );
    }
  }

  return (
    <Container>
      <RefreshableScrollView onRefresh={refetch}>
        <YStack padding="$4" gap="$3">
          {!requests || requests.length === 0 ? (
            <Text color="$gray11">{t("groups.requests.queueEmpty")}</Text>
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
                testID={`group-request-card-${r.id}`}
              >
                <Text fontSize="$5" fontWeight="600">
                  {r.name}
                </Text>
                <Text fontSize="$2" color="$gray11">
                  {t("groups.requests.requestedBy", { name: r.requestedByUserId })}
                </Text>
                <Text fontSize="$3">{r.reason}</Text>
                <XStack gap="$2">
                  <Button
                    theme="green"
                    flex={1}
                    onPress={() => onApprove(r.id)}
                    disabled={approve.isPending}
                    accessibilityRole="button"
                    testID={`group-request-approve-${r.id}`}
                  >
                    {t("groups.requests.approve")}
                  </Button>
                  <Button
                    theme="red"
                    flex={1}
                    onPress={() => onReject(r.id)}
                    disabled={reject.isPending}
                    accessibilityRole="button"
                    testID={`group-request-reject-${r.id}`}
                  >
                    {t("groups.requests.reject")}
                  </Button>
                </XStack>
              </YStack>
            ))
          )}
        </YStack>
      </RefreshableScrollView>
    </Container>
  );
}
