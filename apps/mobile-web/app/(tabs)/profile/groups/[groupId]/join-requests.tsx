// @ts-nocheck - Tamagui type recursion workaround
import {
  useApproveJoinRequest,
  useGroupJoinRequests,
  useRejectJoinRequest,
} from "@repo/api-client";
import { Container, RefreshableScrollView } from "@repo/ui";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";

export default function GroupJoinRequestsScreen() {
  const { t } = useTranslation();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { data: requests, isLoading, refetch } = useGroupJoinRequests(groupId, true);
  const approve = useApproveJoinRequest(groupId);
  const reject = useRejectJoinRequest(groupId);

  if (isLoading) {
    return (
      <Container variant="centered">
        <Spinner size="large" />
      </Container>
    );
  }

  function onReject(reqId: string) {
    const run = (reason: string) => {
      if (!reason?.trim()) return;
      reject
        .mutateAsync({ reqId, reason: reason.trim() })
        .catch((err) =>
          Alert.alert("Error", err instanceof Error ? err.message : t("groups.discover.error")),
        );
    };
    if (Alert.prompt) Alert.prompt(t("groups.joinRequests.rejectPrompt"), undefined, run);
    else run("Declined by organizer");
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
                <Text fontSize="$4">{r.requestedByUserId}</Text>
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
    </Container>
  );
}
