// @ts-nocheck - Tamagui type recursion workaround
// Shown in place of the tabs when the caller belongs to no groups (the API
// returns 409 NO_GROUP, useCurrentGroup().noGroup becomes true). The CTA is
// intentionally passive: invites arrive as links, and the user taps them to
// join. No "paste invite" input yet — the deep-link handler already covers
// both paths.

import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, YStack } from "tamagui";

export function NoGroupOnboarding() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="$6"
      gap="$3"
      paddingTop={insets.top + 24}
      paddingBottom={insets.bottom + 24}
      backgroundColor="$background"
    >
      <Text fontSize="$7" fontWeight="700" textAlign="center">
        {t("groups.noGroup.title")}
      </Text>
      <Text fontSize="$4" color="$gray11" textAlign="center">
        {t("groups.noGroup.body")}
      </Text>
    </YStack>
  );
}
