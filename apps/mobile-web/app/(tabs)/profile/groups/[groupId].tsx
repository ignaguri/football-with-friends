// @ts-nocheck - Tamagui type recursion workaround
import {
  useCurrentGroup,
  useGroupDetail,
  useGroupMembers,
  useLeaveGroup,
} from "@repo/api-client";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Button, Spinner, Text, YStack } from "tamagui";

export default function GroupDetailScreen() {
  const { t } = useTranslation();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { myRole, amIOwner } = useCurrentGroup();
  const { data: group, isLoading } = useGroupDetail(groupId ?? null);
  // Members are only visible to organizers/superadmin — the server returns
  // a stripped group payload for members, so we gate the fetch too.
  const canSeeMembers = myRole === "organizer";
  const { data: members } = useGroupMembers(canSeeMembers ? (groupId ?? null) : null);
  const leaveMutation = useLeaveGroup();

  if (isLoading || !group) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  async function onLeave() {
    if (!groupId) return;
    await leaveMutation.mutateAsync(groupId);
    router.replace("/(tabs)/profile/groups");
  }

  return (
    <ScrollView>
      <YStack padding="$4" gap="$4">
        <YStack gap="$1">
          <Text fontSize="$7" fontWeight="700">
            {group.name}
          </Text>
          <Text color="$gray11">{group.slug}</Text>
        </YStack>

        {canSeeMembers ? (
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="600">
              {t("groups.detail.members")}
            </Text>
            {members?.map((m: any) => (
              <Text key={m.id} color="$gray12">
                {m.userId} — {m.role}
              </Text>
            ))}
          </YStack>
        ) : null}

        {!amIOwner ? (
          <Button
            theme="red"
            onPress={onLeave}
            disabled={leaveMutation.isPending}
          >
            {t("groups.detail.leave")}
          </Button>
        ) : null}
      </YStack>
    </ScrollView>
  );
}
