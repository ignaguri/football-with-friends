// @ts-nocheck - Tamagui type recursion workaround
import {
  type GroupInviteSummary,
  getWebAppUrl,
  useCreateInvite,
  useCurrentGroup,
  useDeleteGroup,
  useGroupDetail,
  useGroupInvites,
  useLeaveGroup,
  useRevokeInvite,
  useSession,
} from "@repo/api-client";
import { AlertDialog, isValidPhoneNumber } from "@repo/ui";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform, ScrollView, Share } from "react-native";
import { Button, Input, Spinner, Text, XStack, YStack } from "tamagui";

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
    session?.user?.role === "admin" || myRole === "organizer";
  const members = isOrganizerView ? (group as any)?.members ?? [] : [];
  const leaveMutation = useLeaveGroup();

  const invitesQuery = useGroupInvites(isOrganizerView ? groupId ?? null : null);
  const createInviteMutation = useCreateInvite(groupId ?? "");
  const revokeInviteMutation = useRevokeInvite(groupId ?? "");
  const deleteMutation = useDeleteGroup();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

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

  // AlertDialog's onConfirm doesn't await the callback, so the mutation is
  // fired-and-tracked via onSuccess/onError callbacks — awaiting here would
  // turn any rejection into an unhandled promise and swallow user feedback.
  function onDelete() {
    if (!groupId) return;
    deleteMutation.mutate(groupId, {
      onSuccess: () => router.replace("/(tabs)/profile/groups"),
      onError: (err) =>
        Alert.alert(
          t("groups.detail.delete"),
          err instanceof Error ? err.message : String(err),
        ),
    });
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
    setPhoneError(null);
    const phone = invitePhone.trim();
    if (phone && !isValidPhoneNumber(phone)) {
      setPhoneError(t("groups.invite.phoneInvalid"));
      return;
    }
    await createInviteMutation.mutateAsync({
      expiresInHours: 24 * 7,
      ...(phone ? { targetPhone: phone } : {}),
    });
    setInvitePhone("");
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
            <Text fontSize="$5" fontWeight="600">
              {t("groups.invite.sectionTitle")}
            </Text>

            <YStack gap="$2">
              <Input
                value={invitePhone}
                onChangeText={(v) => {
                  setInvitePhone(v);
                  if (phoneError) setPhoneError(null);
                }}
                placeholder={t("groups.invite.phonePlaceholder")}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text fontSize="$2" color={phoneError ? "$red10" : "$gray10"}>
                {phoneError ?? t("groups.invite.phoneHint")}
              </Text>
              <Button
                size="$3"
                theme="active"
                onPress={onCreateInvite}
                disabled={createInviteMutation.isPending}
              >
                {t("groups.invite.create")}
              </Button>
            </YStack>

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

        {amIOwner ? (
          <>
            <Button
              theme="red"
              onPress={() => setConfirmDelete(true)}
              disabled={deleteMutation.isPending}
            >
              {t("groups.detail.delete")}
            </Button>
            <AlertDialog
              open={confirmDelete}
              onOpenChange={setConfirmDelete}
              title={t("groups.detail.delete")}
              description={t("groups.detail.deleteConfirm")}
              confirmText={t("groups.detail.delete")}
              cancelText={t("shared.cancel")}
              variant="destructive"
              onConfirm={onDelete}
            />
          </>
        ) : null}
      </YStack>
    </ScrollView>
  );
}
