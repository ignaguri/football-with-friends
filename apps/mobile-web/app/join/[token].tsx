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
  // useLocalSearchParams returns `string | string[] | undefined` — normalize
  // to a single string before we pass it to the API as a token.
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const rawToken = params.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const { data: session, isPending: isSessionPending } = useSession();

  const {
    data: preview,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useInvitePreview(token ?? null);

  const acceptMutation = useAcceptInvite();
  const isSignedIn = !!session?.user;

  function runAccept() {
    if (!token) return;
    acceptMutation.mutate(token, {
      onSuccess: (result) => {
        // Only auto-navigate freshly joined users. If they were already in
        // the group, render the already-member screen instead of silently
        // dumping them into /matches with no context.
        if (result.newMembership) {
          router.replace("/(tabs)/matches");
        }
      },
    });
  }

  useEffect(() => {
    if (!token || !isSignedIn || preview?.valid !== true) return;
    if (acceptMutation.isPending || acceptMutation.isSuccess || acceptMutation.isError) return;
    runAccept();
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
        <Button onPress={() => router.replace("/(tabs)")}>
          {t("groups.invite.goHome")}
        </Button>
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
        <Button onPress={() => router.replace("/(tabs)")}>
          {t("groups.invite.goHome")}
        </Button>
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
        <Button onPress={runAccept}>{t("shared.tryAgain")}</Button>
      </YStack>
    );
  }

  // Already-a-member path: the accept call succeeded but didn't add a new
  // membership. Surface the outcome instead of silently redirecting.
  if (acceptMutation.isSuccess && acceptMutation.data.newMembership === false) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$4">
        <Text fontSize="$7" fontWeight="700" textAlign="center">
          {t("groups.invite.alreadyMemberTitle", {
            groupName: preview.group?.name ?? "",
          })}
        </Text>
        <Text color="$gray11" textAlign="center">
          {t("groups.invite.alreadyMemberBody")}
        </Text>
        <Button theme="active" onPress={() => router.replace("/(tabs)/matches")}>
          {t("groups.invite.goToMatches")}
        </Button>
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
