// @ts-nocheck - Tamagui type recursion workaround
import {
  type GroupInviteSummary,
  type GroupMemberSummary,
  getWebAppUrl,
  useCreateInvite,
  useCurrentGroup,
  useDeleteGroup,
  useGroupDetail,
  useGroupInvites,
  useKickMember,
  useLeaveGroup,
  useRevokeInvite,
  useSession,
  useTransferOwnership,
  useUpdateMemberRole,
} from "@repo/api-client";
import {
  AlertDialog,
  Card,
  Container,
  MembersTable,
  type MemberRow,
  isValidPhoneNumber,
  useToastController,
} from "@repo/ui";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Crown,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserMinus,
} from "@tamagui/lucide-icons-2";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform, Pressable, ScrollView, Share, useWindowDimensions } from "react-native";
import { Button, Input, Spinner, Text, XStack, YStack } from "tamagui";

// Mirrors `getApiErrorMessage` from admin/edit-match.tsx — duplicated
// intentionally until we have a real shared helper to promote.
function getApiErrorMessage(error: Error): string {
  const apiError = error as Error & { data?: { error?: string } };
  if (apiError.data && typeof apiError.data === "object" && "error" in apiError.data) {
    return (apiError.data as { error: string }).error;
  }
  return error.message;
}

type PendingAction =
  | { type: "kick"; member: MemberRow }
  | { type: "promote"; member: MemberRow }
  | { type: "demote"; member: MemberRow }
  | { type: "transfer"; member: MemberRow }
  | null;

export default function GroupDetailScreen() {
  const { t } = useTranslation();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { data: session } = useSession();
  const { myRole, amIOwner } = useCurrentGroup();
  const toast = useToastController();
  const { height: windowHeight } = useWindowDimensions();
  const membersMaxHeight = Math.max(300, Math.min(600, windowHeight * 0.5));

  const { data: group, isLoading, error, refetch } = useGroupDetail(groupId ?? null);

  const isPlatformAdmin = session?.user?.role === "admin";
  const isOrganizerView = isPlatformAdmin || myRole === "organizer";
  const rawMembers: GroupMemberSummary[] = isOrganizerView ? ((group as any)?.members ?? []) : [];

  const leaveMutation = useLeaveGroup();
  const deleteMutation = useDeleteGroup();
  const kickMutation = useKickMember(groupId ?? "");
  const roleMutation = useUpdateMemberRole(groupId ?? "");
  const transferMutation = useTransferOwnership(groupId ?? "");

  const invitesQuery = useGroupInvites(isOrganizerView ? (groupId ?? null) : null);
  const createInviteMutation = useCreateInvite(groupId ?? "");
  const revokeInviteMutation = useRevokeInvite(groupId ?? "");

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [invitePhone, setInvitePhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneModeOpen, setPhoneModeOpen] = useState(false);

  const ownerUserId = (group as any)?.ownerUserId as string | undefined;
  const currentUserId = session?.user?.id;

  // Assemble MemberRow[] with per-row actions. Depends on role, ownership and
  // who the acting user is — compute it here so the MembersTable stays dumb.
  const memberRows = useMemo<MemberRow[]>(() => {
    return rawMembers.map((m) => {
      const isOwner = ownerUserId === m.userId;
      const isMe = currentUserId === m.userId;
      const role: MemberRow["role"] = isOwner
        ? "owner"
        : m.role === "organizer"
          ? "organizer"
          : "member";

      const actions: Array<{
        icon: any;
        label: string;
        onPress: () => void;
        variant?: any;
        testID?: string;
      }> = [];

      // Never show actions on owner row or self row. Both are covered by
      // other surfaces (transfer to someone else, global Leave button).
      if (!isOwner && !isMe) {
        const row: MemberRow = {
          id: m.id,
          userId: m.userId,
          role,
          name: m.name,
          email: m.email,
          phoneNumber: m.phoneNumber,
          username: m.username,
          displayUsername: m.displayUsername,
          isCurrentUser: isMe,
          testID: `group-member-${m.userId}`,
        };

        // Promote/demote/transfer require the owner (backend enforces).
        if (amIOwner) {
          if (role === "member") {
            actions.push({
              icon: ShieldCheck,
              label: t("groups.members.promote"),
              onPress: () => setPending({ type: "promote", member: row }),
              variant: "ghost",
              testID: `group-member-promote-${m.userId}`,
            });
          } else if (role === "organizer") {
            actions.push({
              icon: ShieldOff,
              label: t("groups.members.demote"),
              onPress: () => setPending({ type: "demote", member: row }),
              variant: "ghost",
              testID: `group-member-demote-${m.userId}`,
            });
          }
          actions.push({
            icon: Crown,
            label: t("groups.members.transferOwnership"),
            onPress: () => setPending({ type: "transfer", member: row }),
            variant: "ghost",
            testID: `group-member-transfer-${m.userId}`,
          });
        }

        // Kick is available to any organizer.
        actions.push({
          icon: UserMinus,
          label: t("groups.members.kick"),
          onPress: () => setPending({ type: "kick", member: row }),
          variant: "danger-outline",
          testID: `group-member-kick-${m.userId}`,
        });

        return { ...row, actions };
      }

      return {
        id: m.id,
        userId: m.userId,
        role,
        name: m.name,
        email: m.email,
        phoneNumber: m.phoneNumber,
        username: m.username,
        displayUsername: m.displayUsername,
        isCurrentUser: isMe,
        testID: `group-member-${m.userId}`,
      };
    });
  }, [rawMembers, ownerUserId, currentUserId, amIOwner, t]);

  if (isLoading) {
    return (
      <Container variant="centered">
        <Spinner size="large" />
      </Container>
    );
  }

  if (error || !group) {
    return (
      <Container variant="centered" padding="$4" gap="$3">
        <Text color="$red10" textAlign="center">
          {t("groups.detail.loadError")}
        </Text>
        <Button onPress={() => refetch()}>{t("shared.tryAgain")}</Button>
      </Container>
    );
  }

  async function onLeave() {
    if (!groupId) return;
    await leaveMutation.mutateAsync(groupId);
    router.replace("/(tabs)/profile/groups");
  }

  // AlertDialog's onConfirm doesn't await — use fire-and-track via callbacks
  // so errors reach the UI as a toast.
  function onDelete() {
    if (!groupId) return;
    deleteMutation.mutate(groupId, {
      onSuccess: () => router.replace("/(tabs)/profile/groups"),
      onError: (err) =>
        Alert.alert(t("groups.detail.delete"), err instanceof Error ? err.message : String(err)),
    });
  }

  function runPending(action: NonNullable<PendingAction>) {
    const name =
      action.member.displayUsername ||
      action.member.username ||
      action.member.name ||
      action.member.userId;

    const onSuccess = (successKey: string) => {
      toast.show(t(successKey, { name }), {
        duration: 3000,
        customData: { variant: "success" },
      });
    };
    const onError = (err: unknown) => {
      toast.show(err instanceof Error ? getApiErrorMessage(err) : String(err), {
        duration: 4000,
        customData: { variant: "error" },
      });
    };

    if (action.type === "kick") {
      kickMutation.mutate(action.member.userId, {
        onSuccess: () => onSuccess("groups.members.kicked"),
        onError,
      });
    } else if (action.type === "promote") {
      roleMutation.mutate(
        { userId: action.member.userId, role: "organizer" },
        {
          onSuccess: () => onSuccess("groups.members.promoted"),
          onError,
        },
      );
    } else if (action.type === "demote") {
      roleMutation.mutate(
        { userId: action.member.userId, role: "member" },
        {
          onSuccess: () => onSuccess("groups.members.demoted"),
          onError,
        },
      );
    } else if (action.type === "transfer") {
      transferMutation.mutate(action.member.userId, {
        onSuccess: () => onSuccess("groups.members.ownershipTransferred"),
        onError,
      });
    }
  }

  function inviteLink(token: string): string {
    return `${getWebAppUrl().replace(/\/$/, "")}/join/${token}`;
  }

  async function onCopyInvite(token: string) {
    const link = inviteLink(token);
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        toast.show(t("groups.invite.copied"), {
          duration: 2000,
          customData: { variant: "success" },
        });
        return;
      }
      await Share.share({ message: link });
    } catch (err) {
      toast.show(err instanceof Error ? err.message : String(err), {
        duration: 4000,
        customData: { variant: "error" },
      });
    }
  }

  async function onCreateLinkInvite() {
    try {
      await createInviteMutation.mutateAsync({ expiresInHours: 24 * 7 });
      toast.show(t("groups.invite.created"), {
        duration: 2000,
        customData: { variant: "success" },
      });
    } catch (err) {
      toast.show(err instanceof Error ? getApiErrorMessage(err) : String(err), {
        duration: 4000,
        customData: { variant: "error" },
      });
    }
  }

  async function onCreatePhoneInvite() {
    setPhoneError(null);
    const phone = invitePhone.trim();
    if (!phone) {
      setPhoneError(t("groups.invite.phoneInvalid"));
      return;
    }
    if (!isValidPhoneNumber(phone)) {
      setPhoneError(t("groups.invite.phoneInvalid"));
      return;
    }
    try {
      await createInviteMutation.mutateAsync({
        expiresInHours: 24 * 7,
        targetPhone: phone,
      });
      setInvitePhone("");
      toast.show(t("groups.invite.createdPhone"), {
        duration: 2000,
        customData: { variant: "success" },
      });
    } catch (err) {
      toast.show(err instanceof Error ? getApiErrorMessage(err) : String(err), {
        duration: 4000,
        customData: { variant: "error" },
      });
    }
  }

  const pendingCopy: Record<
    NonNullable<PendingAction>["type"],
    {
      title: string;
      descriptionKey: string;
      confirmKey: string;
      variant: "default" | "destructive";
    }
  > = {
    kick: {
      title: t("groups.members.kick"),
      descriptionKey: "groups.members.kickConfirm",
      confirmKey: "groups.members.kick",
      variant: "destructive",
    },
    promote: {
      title: t("groups.members.promote"),
      descriptionKey: "groups.members.promoteConfirm",
      confirmKey: "groups.members.promote",
      variant: "default",
    },
    demote: {
      title: t("groups.members.demote"),
      descriptionKey: "groups.members.demoteConfirm",
      confirmKey: "groups.members.demote",
      variant: "default",
    },
    transfer: {
      title: t("groups.members.transferOwnership"),
      descriptionKey: "groups.members.transferConfirm",
      confirmKey: "groups.members.transferOwnership",
      variant: "destructive",
    },
  };

  return (
    <Container>
      <ScrollView>
        <YStack padding="$4" gap="$4">
          <YStack gap="$1">
            <Text fontSize="$7" fontWeight="700">
              {group.name}
            </Text>
            <Text color="$gray11">{group.slug}</Text>
          </YStack>

          {isOrganizerView && (
            <YStack gap="$2">
              <Text fontSize="$5" fontWeight="600">
                {t("groups.detail.members")}
                <Text fontSize="$3" color="$gray10" fontWeight="400">
                  {"  "}({memberRows.length})
                </Text>
              </Text>
              <Card variant="outlined" padding="$0">
                <ScrollView style={{ maxHeight: membersMaxHeight }}>
                  <MembersTable
                    members={memberRows}
                    emptyMessage={t("groups.detail.noMembers")}
                    roleLabels={{
                      owner: t("groups.members.owner"),
                      organizer: t("groups.members.organizer"),
                      member: t("groups.members.member"),
                    }}
                    youLabel={t("groups.members.you")}
                  />
                </ScrollView>
              </Card>
            </YStack>
          )}

          {isOrganizerView && (
            <YStack gap="$3">
              <Text fontSize="$5" fontWeight="600">
                {t("groups.invite.sectionTitle")}
              </Text>

              {/* Card 1 — Share a link (primary, always visible) */}
              <Card variant="outlined" padding="$4" gap="$3">
                <YStack gap="$1">
                  <Text fontSize="$4" fontWeight="600">
                    {t("groups.invite.linkMode.title")}
                  </Text>
                  <Text fontSize="$2" color="$gray11">
                    {t("groups.invite.linkMode.description")}
                  </Text>
                </YStack>
                <Button
                  size="$3"
                  theme="active"
                  onPress={onCreateLinkInvite}
                  disabled={createInviteMutation.isPending}
                  testID="group-invite-create-link"
                >
                  {t("groups.invite.createLink")}
                </Button>
              </Card>

              {/* Card 2 — Phone-targeted invite (collapsible, starts closed) */}
              <Card variant="outlined" padding="$0">
                <Pressable
                  onPress={() => setPhoneModeOpen((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={t("groups.invite.phoneMode.title")}
                  testID="group-invite-phone-toggle"
                >
                  <XStack padding="$4" justifyContent="space-between" alignItems="center">
                    <YStack flex={1} gap="$1">
                      <Text fontSize="$4" fontWeight="600">
                        {t("groups.invite.phoneMode.title")}
                      </Text>
                      {!phoneModeOpen && (
                        <Text fontSize="$2" color="$gray10">
                          {t("groups.invite.phoneMode.collapsedHint")}
                        </Text>
                      )}
                    </YStack>
                    {phoneModeOpen ? (
                      <ChevronUp size={20} color="$gray11" />
                    ) : (
                      <ChevronDown size={20} color="$gray11" />
                    )}
                  </XStack>
                </Pressable>
                {phoneModeOpen && (
                  <YStack
                    paddingHorizontal="$4"
                    paddingBottom="$4"
                    gap="$2"
                    borderTopWidth={1}
                    borderTopColor="$borderColor"
                    paddingTop="$3"
                  >
                    <Text fontSize="$2" color="$gray11">
                      {t("groups.invite.phoneMode.description")}
                    </Text>
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
                    {phoneError && (
                      <Text fontSize="$2" color="$red10">
                        {phoneError}
                      </Text>
                    )}
                    <Button
                      size="$3"
                      theme="active"
                      onPress={onCreatePhoneInvite}
                      disabled={createInviteMutation.isPending}
                      testID="group-invite-create-phone"
                    >
                      {t("groups.invite.createPhone")}
                    </Button>
                  </YStack>
                )}
              </Card>

              {/* Active invites list */}
              <YStack gap="$2">
                <Text fontSize="$4" fontWeight="600">
                  {t("groups.invite.activeTitle")}
                </Text>
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
                        {inv.targetPhone
                          ? `  ·  ${t("groups.invite.forPhone", { phone: inv.targetPhone })}`
                          : ""}
                      </Text>
                      <XStack gap="$2">
                        <Button
                          size="$2"
                          onPress={() => onCopyInvite(inv.token)}
                          testID={`group-invite-copy-${inv.id}`}
                        >
                          <XStack gap="$1" alignItems="center">
                            <Copy size={14} />
                            <Text>{t("groups.invite.copy")}</Text>
                          </XStack>
                        </Button>
                        <Button
                          size="$2"
                          theme="red"
                          onPress={() => revokeInviteMutation.mutate(inv.id)}
                          disabled={revokeInviteMutation.isPending}
                          testID={`group-invite-revoke-${inv.id}`}
                        >
                          {t("groups.invite.revoke")}
                        </Button>
                      </XStack>
                    </YStack>
                  ))
                )}
              </YStack>
            </YStack>
          )}

          {!amIOwner && (
            <Button
              theme="red"
              onPress={onLeave}
              disabled={leaveMutation.isPending}
              testID="group-detail-leave"
            >
              {t("groups.detail.leave")}
            </Button>
          )}

          {amIOwner && (
            <Button
              theme="red"
              onPress={() => setConfirmDelete(true)}
              disabled={deleteMutation.isPending}
              testID="group-detail-delete"
            >
              <XStack gap="$2" alignItems="center">
                <Trash2 size={16} />
                <Text>{t("groups.detail.delete")}</Text>
              </XStack>
            </Button>
          )}
        </YStack>
      </ScrollView>

      {/* Delete-group confirm */}
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

      {/* Per-member action confirm (promote/demote/kick/transfer) */}
      {pending && (
        <AlertDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setPending(null);
          }}
          title={pendingCopy[pending.type].title}
          description={t(pendingCopy[pending.type].descriptionKey, {
            name:
              pending.member.displayUsername ||
              pending.member.username ||
              pending.member.name ||
              pending.member.userId,
          })}
          confirmText={t(pendingCopy[pending.type].confirmKey)}
          cancelText={t("shared.cancel")}
          variant={pendingCopy[pending.type].variant}
          onConfirm={() => {
            runPending(pending);
            setPending(null);
          }}
        />
      )}
    </Container>
  );
}
