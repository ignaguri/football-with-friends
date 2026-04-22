// @ts-nocheck - Tamagui type recursion workaround
import {
  useCurrentGroup,
  useGroupDetail,
  useLeaveGroup,
  useSession,
} from "@repo/api-client";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Button, Spinner, Text, YStack } from "tamagui";

export default function GroupDetailScreen() {
  const { t } = useTranslation();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { data: session } = useSession();
  const { myRole, amIOwner } = useCurrentGroup();
  const { data: group, isLoading } = useGroupDetail(groupId ?? null);

  // The server already returns `members` inlined on the detail response for
  // organizers/superadmin, so we read from there rather than firing a
  // separate /members query.
  const isOrganizerView =
    session?.user?.role === "superadmin" || myRole === "organizer";
  const members = isOrganizerView ? (group as any)?.members ?? [] : [];
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

        {isOrganizerView ? (
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="600">
              {t("groups.detail.members")}
            </Text>
            {members.map((m: any) => (
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
