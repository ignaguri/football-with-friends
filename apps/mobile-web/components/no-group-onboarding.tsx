// @ts-nocheck - Tamagui type recursion workaround
// Shown in place of the tabs when the caller belongs to no groups (the API
// returns 409 NO_GROUP, useCurrentGroup().noGroup becomes true). The CTA is
// intentionally passive: invites arrive as links, and the user taps them to
// join. No "paste invite" input yet — the deep-link handler already covers
// both paths. Sign-out is the only escape hatch from this screen.

import { signOut } from "@repo/api-client";
import { Users } from "@tamagui/lucide-icons-2";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, YStack } from "tamagui";

export function NoGroupOnboarding() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  async function onSignOut() {
    // Unregister the Expo push token before clearing the session so the
    // backend stops targeting this device. Matches the pattern in
    // `profile/index.tsx`.
    try {
      const { unregisterPushToken } = await import(
        "../lib/use-push-notifications"
      );
      await unregisterPushToken();
    } catch {}
    await signOut();
    router.replace("/(auth)");
  }

  return (
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="$6"
      gap="$4"
      paddingTop={insets.top + 24}
      paddingBottom={insets.bottom + 24}
      backgroundColor="$background"
    >
      <YStack
        width={96}
        height={96}
        borderRadius="$12"
        backgroundColor="$gray4"
        justifyContent="center"
        alignItems="center"
      >
        <Users size={48} color="$gray10" />
      </YStack>
      <Text fontSize="$7" fontWeight="700" textAlign="center">
        {t("groups.noGroup.title")}
      </Text>
      <Text fontSize="$4" color="$gray11" textAlign="center">
        {t("groups.noGroup.body")}
      </Text>
      <Text fontSize="$3" color="$gray10" textAlign="center">
        {t("groups.noGroup.hint")}
      </Text>
      <Button variant="outlined" onPress={onSignOut} marginTop="$2">
        {t("groups.noGroup.signOut")}
      </Button>
    </YStack>
  );
}
