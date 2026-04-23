// @ts-nocheck - Tamagui type recursion workaround
import {
  type GroupInviteSummary,
  getWebAppUrl,
  useCreateInvite,
  useCurrentGroup,
  useGroupDetail,
  useGroupInvites,
  useLeaveGroup,
  useRevokeInvite,
  useSession,
} from "@repo/api-client";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform, ScrollView, Share } from "react-native";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";

export default function GroupDetailScreen() {
  const { t } = useTranslation();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { data: session } = useSession();
  const { myRole, amIOwner } = useCurrentGroup();
  const {
    data: group,
    isLoading,
    error,
    refetch,
  } = useGroupDetail(groupId ?? null);

  const isOrganizerView =
    session?.user?.role === "superadmin" || myRole === "organizer";
  const members = isOrganizerView ? (group as any)?.members ?? [] : [];
  const leaveMutation = useLeaveGroup();

  const invitesQuery = useGroupInvites(isOrganizerView ? groupId ?? null : null);
  const createInviteMutation = useCreateInvite(groupId ?? "");
  const revokeInviteMutation = useRevokeInvite(groupId ?? "");

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  if (error || !group) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$3">
        <Text color="$red10" textAlign="center">
          {t("groups.detail.loadError")}
        </Text>
        <Button onPress={() => refetch()}>{t("shared.tryAgain")}</Button>
      </YStack>
    );
  }

  async function onLeave() {
    if (!groupId) return;
    await leaveMutation.mutateAsync(groupId);
    router.replace("/(tabs)/profile/groups");
  }

  function inviteLink(token: string): string {
    return `${getWebAppUrl().replace(/\/$/, "")}/join/${token}`;
  }

  async function onCopyInvite(token: string) {
    const link = inviteLink(token);
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(link);
      return;
    }
    await Share.share({ message: link });
  }

  async function onCreateInvite() {
    await createInviteMutation.mutateAsync({
      expiresInHours: 24 * 7,
    });
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

        {isOrganizerView ? (
          <YStack gap="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$5" fontWeight="600">
                {t("groups.invite.sectionTitle")}
              </Text>
              <Button
                size="$3"
                theme="active"
                onPress={onCreateInvite}
                disabled={createInviteMutation.isPending}
              >
                {t("groups.invite.create")}
              </Button>
            </XStack>

            {invitesQuery.isLoading ? (
              <Spinner />
            ) : (invitesQuery.data ?? []).length === 0 ? (
              <Text color="$gray11">{t("groups.invite.empty")}</Text>
            ) : (
              (invitesQuery.data ?? []).map((inv: GroupInviteSummary) => (
                <YStack
                  key={inv.id}
                  padding="$3"
                  borderRadius="$3"
                  backgroundColor="$background"
                  borderWidth={1}
                  borderColor="$gray6"
                  gap="$2"
                >
                  <Text fontSize="$3" color="$gray11" numberOfLines={1}>
                    {inviteLink(inv.token)}
                  </Text>
                  <Text fontSize="$2" color="$gray10">
                    {inv.expiresAt
                      ? t("groups.invite.expiresAt", {
                          date: new Date(inv.expiresAt).toLocaleString(),
                        })
                      : t("groups.invite.neverExpires")}
                    {typeof inv.maxUses === "number"
                      ? `  ·  ${inv.usesCount}/${inv.maxUses}`
                      : ""}
                  </Text>
                  <XStack gap="$2">
                    <Button size="$2" onPress={() => onCopyInvite(inv.token)}>
                      {t("groups.invite.copy")}
                    </Button>
                    <Button
                      size="$2"
                      theme="red"
                      onPress={() => revokeInviteMutation.mutate(inv.id)}
                      disabled={revokeInviteMutation.isPending}
                    >
                      {t("groups.invite.revoke")}
                    </Button>
                  </XStack>
                </YStack>
              ))
            )}
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
