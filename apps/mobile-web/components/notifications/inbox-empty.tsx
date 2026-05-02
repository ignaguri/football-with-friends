// @ts-nocheck - Tamagui type recursion workaround
import { Text, YStack } from "@repo/ui";
import { Bell } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { useTheme } from "tamagui";

export function InboxEmpty() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <YStack
      alignItems="center"
      justifyContent="center"
      paddingVertical="$10"
      gap="$3"
    >
      <Bell size={48} color={theme.gray8?.val} />
      <Text fontSize="$5" fontWeight="600" color="$gray11">
        {t("notifications.inbox.empty")}
      </Text>
      <Text
        fontSize="$3"
        color="$gray10"
        textAlign="center"
        paddingHorizontal="$6"
      >
        {t("notifications.inbox.emptyHint")}
      </Text>
    </YStack>
  );
}
