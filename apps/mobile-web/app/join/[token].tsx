// @ts-nocheck - Tamagui type recursion workaround
// Landing page for invite deep-links (`footballwithfriends://join/<token>`
// and `https://.../join/<token>`). Works for both signed-in and signed-out
// users: signed-out flow shows a sign-in CTA with a `redirectTo` preserving
// the token; signed-in flow accepts on mount and navigates into the group.

import {
  useAcceptInvite,
  useInvitePreview,
  useSession,
} from "@repo/api-client";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button, Spinner, Text, YStack } from "tamagui";

export default function JoinScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { data: session, isPending: isSessionPending } = useSession();

  const {
    data: preview,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useInvitePreview(token ?? null);

  const acceptMutation = useAcceptInvite();
  const isSignedIn = !!session?.user;

  useEffect(() => {
    if (!token || !isSignedIn || preview?.valid !== true) return;
    if (acceptMutation.isPending || acceptMutation.isSuccess || acceptMutation.isError) return;
    acceptMutation.mutate(token, {
      onSuccess: () => router.replace("/(tabs)/matches"),
    });
  }, [token, isSignedIn, preview?.valid]);

  if (isSessionPending || isPreviewLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  if (previewError || !preview) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$3">
        <Text fontSize="$6" fontWeight="700">
          {t("groups.invite.loadErrorTitle")}
        </Text>
        <Text color="$gray11" textAlign="center">
          {t("groups.invite.loadErrorBody")}
        </Text>
      </YStack>
    );
  }

  if (!preview.valid) {
    const reason = preview.reason ?? "not_found";
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$3">
        <Text fontSize="$6" fontWeight="700">
          {t("groups.invite.invalidTitle")}
        </Text>
        <Text color="$gray11" textAlign="center">
          {t(`groups.invite.invalidReason.${reason}`)}
        </Text>
      </YStack>
    );
  }

  if (!isSignedIn) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$4">
        <Text fontSize="$7" fontWeight="700" textAlign="center">
          {t("groups.invite.previewTitle", { groupName: preview.group?.name ?? "" })}
        </Text>
        {preview.inviter?.name ? (
          <Text color="$gray11" textAlign="center">
            {t("groups.invite.invitedBy", { name: preview.inviter.name })}
          </Text>
        ) : null}
        <Button
          theme="active"
          onPress={() =>
            router.push({
              pathname: "/(auth)",
              params: { redirectTo: `/join/${token}` },
            })
          }
        >
          {t("groups.invite.signInToJoin")}
        </Button>
      </YStack>
    );
  }

  if (acceptMutation.isError) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$3">
        <Text fontSize="$6" fontWeight="700">
          {t("groups.invite.acceptFailedTitle")}
        </Text>
        <Text color="$gray11" textAlign="center">
          {t("groups.invite.acceptFailedBody")}
        </Text>
        <Button onPress={() => acceptMutation.reset()}>{t("shared.tryAgain")}</Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$3">
      <Spinner size="large" />
      <Text color="$gray11">{t("groups.invite.joining")}</Text>
    </YStack>
  );
}
