// @ts-nocheck - Tamagui type recursion workaround
//
// Mode chooser, shown once per session between sign-in and the tabs.
//
// The choice is a view preference, not a permission — see the note in
// `lib/view-mode-context.tsx`. Picking "organizer" only unlocks organizer UI
// in the groups where the user already holds that role.
//
// A user with no organizer role anywhere is not sent into `/(tabs)` to request
// a group: `(tabs)/_layout.tsx` short-circuits every tab route to
// `NoGroupOnboarding` while `noGroup` is true, so the request screen is
// unreachable that way. The request form is inlined here instead, on a route
// that sits outside the tabs.

import {
  useCurrentGroup,
  useMyGroupRequests,
  useSubmitGroupRequest,
  useSession,
} from "@repo/api-client";
import { Button, Container, Input, Spinner, Text, XStack, YStack } from "@repo/ui";
import { CalendarCog, ChevronRight, User } from "@tamagui/lucide-icons-2";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable } from "react-native";
import { useTheme } from "tamagui";

import { useViewMode } from "../lib/view-mode-context";

function ModeCard({ icon, title, body, onPress, testID, accessibilityLabel }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={{ width: "100%" }}
    >
      <XStack
        alignItems="center"
        gap="$4"
        padding="$4"
        borderRadius="$6"
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$gray2"
      >
        <YStack
          width={48}
          height={48}
          borderRadius="$10"
          backgroundColor="$gray4"
          justifyContent="center"
          alignItems="center"
        >
          {icon}
        </YStack>
        <YStack flex={1} gap="$1">
          <Text fontSize="$6" fontWeight="700">
            {title}
          </Text>
          <Text fontSize="$3" color="$gray11">
            {body}
          </Text>
        </YStack>
        <ChevronRight size={20} color={theme.gray10?.val} />
      </XStack>
    </Pressable>
  );
}

export default function ModeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: session, isPending } = useSession();
  const { setMode } = useViewMode();
  const { myGroups, isLoading: groupsLoading } = useCurrentGroup();

  const [needsGroup, setNeedsGroup] = useState(false);
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");

  const { data: requests } = useMyGroupRequests();
  const submitRequest = useSubmitGroupRequest();

  if (isPending || groupsLoading) {
    return (
      <Container variant="centered">
        <Spinner size="large" />
      </Container>
    );
  }

  if (!session?.user) return <Redirect href="/(auth)" />;

  // Platform admins keep their global override, mirroring `(tabs)/_layout.tsx`.
  const isPlatformAdmin = session.user.role === "admin";
  const organizesSomewhere =
    isPlatformAdmin || myGroups.some((g) => g.myRole === "organizer" || g.amIOwner);

  const pendingRequest = requests?.find((r) => r.status === "pending");

  function choosePlayer() {
    setMode("player");
    router.replace("/(tabs)");
  }

  function chooseOrganizer() {
    if (organizesSomewhere) {
      setMode("organizer");
      router.replace("/(tabs)");
      return;
    }
    // No organizer role anywhere: becoming an organizer means owning a group,
    // and group creation goes through the existing approval flow.
    setNeedsGroup(true);
  }

  async function onSubmitRequest() {
    if (!name.trim() || !reason.trim()) return;
    try {
      await submitRequest.mutateAsync({ name: name.trim(), reason: reason.trim() });
      setName("");
      setReason("");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : t("groups.requests.error"));
    }
  }

  if (needsGroup) {
    return (
      <Container variant="padded">
        <YStack flex={1} justifyContent="center" gap="$4" maxWidth={480} marginHorizontal="auto">
          <YStack gap="$2">
            <Text fontSize="$8" fontWeight="700">
              {t("mode.needGroup.title")}
            </Text>
            <Text fontSize="$4" color="$gray11">
              {t("mode.needGroup.body")}
            </Text>
          </YStack>

          {pendingRequest ? (
            <YStack
              gap="$2"
              padding="$4"
              borderRadius="$6"
              borderWidth={1}
              borderColor="$borderColor"
              backgroundColor="$gray2"
            >
              <Text fontSize="$5" fontWeight="600">
                {pendingRequest.name}
              </Text>
              <Text color="$gray11">{t("mode.needGroup.pending")}</Text>
            </YStack>
          ) : (
            <YStack gap="$3">
              <Input
                label={t("mode.needGroup.nameLabel")}
                placeholder={t("mode.needGroup.namePlaceholder")}
                value={name}
                onChangeText={setName}
                testID="mode-request-name"
              />
              <Input
                label={t("mode.needGroup.reasonLabel")}
                placeholder={t("mode.needGroup.reasonPlaceholder")}
                value={reason}
                onChangeText={setReason}
                testID="mode-request-reason"
              />
              <Button
                onPress={onSubmitRequest}
                disabled={!name.trim() || !reason.trim() || submitRequest.isPending}
                opacity={!name.trim() || !reason.trim() || submitRequest.isPending ? 0.5 : 1}
                testID="mode-request-submit"
              >
                {submitRequest.isPending
                  ? t("mode.needGroup.submitting")
                  : t("mode.needGroup.submit")}
              </Button>
            </YStack>
          )}

          <Button variant="ghost" onPress={choosePlayer} testID="mode-continue-as-player">
            {t("mode.continueAsPlayer")}
          </Button>
        </YStack>
      </Container>
    );
  }

  return (
    <Container variant="padded">
      <YStack flex={1} justifyContent="center" gap="$5" maxWidth={480} marginHorizontal="auto">
        <YStack gap="$2">
          <Text fontSize="$8" fontWeight="700">
            {t("mode.title")}
          </Text>
          <Text fontSize="$4" color="$gray11">
            {t("mode.subtitle")}
          </Text>
        </YStack>

        <YStack gap="$3">
          <ModeCard
            icon={<User size={24} color={theme.gray11?.val} />}
            title={t("mode.player.title")}
            body={t("mode.player.body")}
            onPress={choosePlayer}
            testID="mode-card-player"
            accessibilityLabel={t("a11y.chooseModePlayer")}
          />
          <ModeCard
            icon={<CalendarCog size={24} color={theme.gray11?.val} />}
            title={t("mode.organizer.title")}
            body={t("mode.organizer.body")}
            onPress={chooseOrganizer}
            testID="mode-card-organizer"
            accessibilityLabel={t("a11y.chooseModeOrganizer")}
          />
        </YStack>

        <Text fontSize="$2" color="$gray10" textAlign="center">
          {t("mode.footnote")}
        </Text>
      </YStack>
    </Container>
  );
}
