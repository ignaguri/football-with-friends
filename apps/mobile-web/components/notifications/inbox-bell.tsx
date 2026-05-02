// @ts-nocheck - Tamagui type recursion workaround
import { useUnreadNotificationCount } from "@repo/api-client";
import { Text, XStack } from "@repo/ui";
import { Bell } from "@tamagui/lucide-icons-2";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { useTheme } from "tamagui";

const MAX_VISIBLE = 99;

export function InboxBell() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data } = useUnreadNotificationCount();
  const unread = Math.max(0, data?.unreadCount ?? 0);
  const showBadge = unread > 0;
  const badgeText = unread > MAX_VISIBLE ? `${MAX_VISIBLE}+` : String(unread);

  const label = showBadge
    ? t("a11y.openInboxWithUnread", { count: unread })
    : t("a11y.openInbox");

  return (
    <Pressable
      onPress={() => router.push("/inbox")}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="home-header-inbox"
      hitSlop={8}
      style={{ paddingLeft: 8, paddingRight: 16, paddingVertical: 4 }}
    >
      <XStack position="relative">
        <Bell size={22} color={theme.color?.val} />
        {showBadge && (
          <XStack
            position="absolute"
            top={-6}
            right={-8}
            minWidth={18}
            height={18}
            borderRadius={9}
            backgroundColor="$red10"
            alignItems="center"
            justifyContent="center"
            paddingHorizontal={4}
          >
            <Text color="white" fontSize={10} fontWeight="700">
              {badgeText}
            </Text>
          </XStack>
        )}
      </XStack>
    </Pressable>
  );
}
