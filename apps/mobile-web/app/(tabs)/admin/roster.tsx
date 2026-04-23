// @ts-nocheck - Tamagui type recursion workaround
import {
  type GroupRosterEntry,
  useCreateRosterEntry,
  useCurrentGroup,
  useDeleteRosterEntry,
  useGroupMembers,
  useGroupRoster,
  useUpdateRosterEntry,
} from "@repo/api-client";
import {
  AlertDialog,
  Badge,
  Button,
  Card,
  Container,
  Dialog,
  Input,
  Spinner,
  Text,
  YStack,
  XStack,
} from "@repo/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView } from "react-native";

function apiErrorInfo(err: unknown): {
  reason?: string;
  message: string;
  referencingSignupCount?: number;
  userId?: string;
} {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: Record<string, unknown> }).data;
    if (data && typeof data === "object") {
      const reason = typeof data.error === "string" ? data.error : undefined;
      const referencingSignupCount =
        typeof data.referencingSignupCount === "number"
          ? data.referencingSignupCount
          : undefined;
      const userId = typeof data.userId === "string" ? data.userId : undefined;
      return {
        reason,
        message: reason ?? "Something went wrong",
        referencingSignupCount,
        userId,
      };
    }
  }
  return {
    message: err instanceof Error ? err.message : String(err),
  };
}

export default function AdminRosterScreen() {
  const { t } = useTranslation();
  const { groupId } = useCurrentGroup();
  const rosterQuery = useGroupRoster(groupId);
  const membersQuery = useGroupMembers(groupId);
  const createMutation = useCreateRosterEntry(groupId ?? "");
  const updateMutation = useUpdateRosterEntry(groupId ?? "");
  const deleteMutation = useDeleteRosterEntry(groupId ?? "");

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [editing, setEditing] = useState<GroupRosterEntry | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // `referencingSignupCount` present ⇒ we already hit the 409 and the user
  // is confirming the force-delete path; absent ⇒ first-time confirm.
  const [deleteState, setDeleteState] = useState<{
    entry: GroupRosterEntry;
    referencingSignupCount?: number;
  } | null>(null);

  const [linkingEntry, setLinkingEntry] = useState<GroupRosterEntry | null>(null);
  const [linkSearch, setLinkSearch] = useState("");

  const roster = rosterQuery.data ?? [];

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      await createMutation.mutateAsync({
        displayName: newName.trim(),
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
      });
      setNewName("");
      setNewPhone("");
      setNewEmail("");
    } catch (err) {
      const info = apiErrorInfo(err);
      if (info.reason === "already_member") {
        Alert.alert(
          t("groups.roster.title"),
          t("groups.roster.alreadyMemberError"),
        );
      } else {
        Alert.alert(t("groups.roster.title"), info.message);
      }
    }
  }

  function openEdit(entry: GroupRosterEntry) {
    setEditing(entry);
    setEditName(entry.displayName);
    setEditPhone(entry.phone ?? "");
    setEditEmail(entry.email ?? "");
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const patch: {
      displayName?: string;
      phone?: string | null;
      email?: string | null;
    } = {};
    if (editName.trim() !== editing.displayName) patch.displayName = editName.trim();
    const phoneVal = editPhone.trim();
    const prevPhone = editing.phone ?? "";
    if (phoneVal !== prevPhone) patch.phone = phoneVal || null;
    const emailVal = editEmail.trim();
    const prevEmail = editing.email ?? "";
    if (emailVal !== prevEmail) patch.email = emailVal || null;
    if (Object.keys(patch).length === 0) {
      setEditing(null);
      return;
    }
    try {
      await updateMutation.mutateAsync({ rosterId: editing.id, patch });
      setEditing(null);
    } catch (err) {
      Alert.alert(t("groups.roster.title"), apiErrorInfo(err).message);
    }
  }

  function requestDelete(entry: GroupRosterEntry) {
    setEditing(null);
    setDeleteState({ entry });
  }

  async function runDelete(entry: GroupRosterEntry, force: boolean) {
    try {
      await deleteMutation.mutateAsync({ rosterId: entry.id, force });
      setDeleteState(null);
    } catch (err) {
      const info = apiErrorInfo(err);
      if (info.reason === "referenced" && typeof info.referencingSignupCount === "number") {
        setDeleteState({
          entry,
          referencingSignupCount: info.referencingSignupCount,
        });
      } else {
        Alert.alert(t("groups.roster.title"), info.message);
      }
    }
  }

  async function handleUnlink(entry: GroupRosterEntry) {
    try {
      await updateMutation.mutateAsync({
        rosterId: entry.id,
        patch: { claimedByUserId: null },
      });
      setEditing(null);
    } catch (err) {
      Alert.alert(t("groups.roster.title"), apiErrorInfo(err).message);
    }
  }

  async function handleLink(userId: string) {
    if (!linkingEntry) return;
    try {
      await updateMutation.mutateAsync({
        rosterId: linkingEntry.id,
        patch: { claimedByUserId: userId },
      });
      setLinkingEntry(null);
      setEditing(null);
    } catch (err) {
      Alert.alert(t("groups.roster.title"), apiErrorInfo(err).message);
    }
  }

  const members = membersQuery.data ?? [];
  const filteredMembers = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m: any) => {
      const name = m.user?.name ?? m.userId ?? "";
      return String(name).toLowerCase().includes(q);
    });
  }, [members, linkSearch]);

  return (
    <Container variant="padded">
      <ScrollView>
        <YStack gap="$4" paddingBottom="$6">
          <Card>
            <YStack padding="$4" gap="$3">
              <Text fontSize="$5" fontWeight="600">
                {t("groups.roster.add")}
              </Text>
              <Input
                label={t("groups.roster.displayName")}
                value={newName}
                onChangeText={setNewName}
                placeholder={t("groups.roster.displayName")}
                testID="roster-add-name"
              />
              <Input
                label={t("groups.roster.phone")}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="+1234567890"
                keyboardType="phone-pad"
                testID="roster-add-phone"
              />
              <Input
                label={t("groups.roster.email")}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="name@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                testID="roster-add-email"
              />
              <Button
                variant="primary"
                onPress={handleCreate}
                disabled={!newName.trim() || createMutation.isPending}
                testID="roster-add-submit"
              >
                {createMutation.isPending ? <Spinner /> : t("groups.roster.add")}
              </Button>
            </YStack>
          </Card>

          {rosterQuery.isLoading ? (
            <YStack padding="$4" alignItems="center">
              <Spinner />
            </YStack>
          ) : roster.length === 0 ? (
            <Text color="$gray11" textAlign="center" padding="$4">
              {t("groups.roster.empty")}
            </Text>
          ) : (
            roster.map((entry) => (
              <Card
                key={entry.id}
                onPress={() => openEdit(entry)}
                testID={`roster-row-${entry.id}`}
              >
                <XStack padding="$3" alignItems="center" gap="$3">
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$4" fontWeight="600">
                      {entry.displayName}
                    </Text>
                    {entry.claimedByUser ? (
                      <Text fontSize="$2" color="$gray11">
                        {t("groups.roster.linkedTo", {
                          name: entry.claimedByUser.name,
                        })}
                      </Text>
                    ) : entry.phone || entry.email ? (
                      <Text fontSize="$2" color="$gray11" numberOfLines={1}>
                        {entry.phone ?? entry.email}
                      </Text>
                    ) : null}
                  </YStack>
                  <Badge
                    variant={entry.claimedByUserId ? "success" : "secondary"}
                  >
                    {entry.claimedByUserId
                      ? t("groups.roster.claimed")
                      : t("groups.roster.unclaimed")}
                  </Badge>
                </XStack>
              </Card>
            ))
          )}
        </YStack>
      </ScrollView>

      {/* Edit dialog */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={t("groups.roster.editTitle")}
        confirmText={updateMutation.isPending ? <Spinner /> : t("shared.save")}
        cancelText={t("shared.cancel")}
        onConfirm={handleSaveEdit}
        onCancel={() => setEditing(null)}
      >
        {editing ? (
          <YStack gap="$3" padding="$4">
            <Input
              label={t("groups.roster.displayName")}
              value={editName}
              onChangeText={setEditName}
            />
            <Input
              label={t("groups.roster.phone")}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
              placeholder="+1234567890"
            />
            <Input
              label={t("groups.roster.email")}
              value={editEmail}
              onChangeText={setEditEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {editing.claimedByUser ? (
              <Button
                variant="outline"
                onPress={() => handleUnlink(editing)}
                testID="roster-edit-unlink"
              >
                {t("groups.roster.unlinkFromMember", {
                  name: editing.claimedByUser.name,
                })}
              </Button>
            ) : (
              <Button
                variant="outline"
                onPress={() => {
                  setLinkingEntry(editing);
                  setLinkSearch("");
                }}
                testID="roster-edit-link"
              >
                {t("groups.roster.linkToMember")}
              </Button>
            )}
            <Button
              variant="danger"
              onPress={() => requestDelete(editing)}
              testID="roster-edit-delete"
            >
              {t("groups.roster.deleteCta")}
            </Button>
          </YStack>
        ) : null}
      </Dialog>

      {/* Link-to-member picker */}
      <Dialog
        open={!!linkingEntry}
        onOpenChange={(open) => !open && setLinkingEntry(null)}
        title={t("groups.roster.linkToMember")}
        showActions={false}
      >
        <YStack gap="$3" padding="$4" maxHeight={480}>
          <Input
            placeholder={t("groups.roster.searchMembers")}
            value={linkSearch}
            onChangeText={setLinkSearch}
          />
          <ScrollView style={{ maxHeight: 320 }}>
            <YStack gap="$2">
              {filteredMembers.map((m: any) => {
                const name = m.user?.name ?? m.userId;
                return (
                  <Button
                    key={m.id}
                    variant="outline"
                    onPress={() => handleLink(m.userId)}
                    testID={`roster-link-member-${m.userId}`}
                  >
                    {name}
                  </Button>
                );
              })}
              {filteredMembers.length === 0 ? (
                <Text color="$gray11" textAlign="center">
                  {t("groups.roster.noMembersFound")}
                </Text>
              ) : null}
            </YStack>
          </ScrollView>
          <Button variant="outline" onPress={() => setLinkingEntry(null)}>
            {t("shared.cancel")}
          </Button>
        </YStack>
      </Dialog>

      <AlertDialog
        open={!!deleteState}
        onOpenChange={(open) => !open && setDeleteState(null)}
        title={t("groups.roster.deleteTitle")}
        description={
          deleteState
            ? deleteState.referencingSignupCount !== undefined
              ? t("groups.roster.forceDeleteConfirm", {
                  name: deleteState.entry.displayName,
                  count: deleteState.referencingSignupCount,
                })
              : t("groups.roster.deleteConfirm", {
                  name: deleteState.entry.displayName,
                })
            : undefined
        }
        confirmText={
          deleteState?.referencingSignupCount !== undefined
            ? t("groups.roster.forceDeleteCta")
            : t("groups.roster.deleteCta")
        }
        cancelText={t("shared.cancel")}
        variant="destructive"
        onConfirm={() =>
          deleteState &&
          runDelete(
            deleteState.entry,
            deleteState.referencingSignupCount !== undefined,
          )
        }
      />
    </Container>
  );
}
