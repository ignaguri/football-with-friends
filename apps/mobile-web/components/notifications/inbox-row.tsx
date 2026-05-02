// @ts-nocheck - Tamagui type recursion workaround
import type { InboxNotification } from "@repo/api-client";
import { NOTIFICATION_TYPES, type NotificationType } from "@repo/shared/domain";
import { Text, XStack, YStack } from "@repo/ui";
import {
  Bell,
  CalendarPlus,
  CalendarX,
  CheckCircle2,
  Clock,
  Edit3,
  ThumbsUp,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
  Wallet,
} from "@tamagui/lucide-icons-2";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { useTheme } from "tamagui";

import { getLocale } from "../../lib/date-utils";

const ICON_BY_TYPE: Record<NotificationType, typeof Bell> = {
  [NOTIFICATION_TYPES.MATCH_CREATED]: CalendarPlus,
  [NOTIFICATION_TYPES.MATCH_UPDATED]: Edit3,
  [NOTIFICATION_TYPES.MATCH_CANCELLED]: CalendarX,
  [NOTIFICATION_TYPES.PLAYER_CONFIRMED]: CheckCircle2,
  [NOTIFICATION_TYPES.SUBSTITUTE_PROMOTED]: UserCheck,
  [NOTIFICATION_TYPES.PLAYER_CANCELLED]: UserX,
  [NOTIFICATION_TYPES.REMOVED_FROM_MATCH]: UserMinus,
  [NOTIFICATION_TYPES.MATCH_REMINDER]: Clock,
  [NOTIFICATION_TYPES.VOTING_OPEN]: ThumbsUp,
  [NOTIFICATION_TYPES.ENGAGEMENT_REMINDER]: Bell,
  [NOTIFICATION_TYPES.PAYMENT_REMINDER]: Wallet,
  // Group invites are never persisted to the inbox, but the key is required
  // to make this Record exhaustive — adding a new NotificationType becomes a
  // compile error here instead of a silent fall-through to the Bell default.
  [NOTIFICATION_TYPES.GROUP_INVITE]: UserPlus,
};

interface InboxRowProps {
  item: InboxNotification;
  onPress: (item: InboxNotification) => void;
}

export function InboxRow({ item, onPress }: InboxRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const Icon = ICON_BY_TYPE[item.type] ?? Bell;
  const isUnread = !item.readAt;
  const locale = getLocale();

  const typeLabel = t(`notifications.inbox.types.${item.type}`, {
    defaultValue: item.title ?? "",
  });
  const title = item.title || typeLabel;

  let relative = "";
  try {
    relative = formatDistanceToNow(parseISO(item.createdAt), {
      addSuffix: true,
      locale,
    });
  } catch {
    relative = item.createdAt;
  }

  const accessibilityLabel = `${title}. ${item.body}`;

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t("a11y.openNotification")}
    >
      <XStack
        gap="$3"
        paddingHorizontal="$4"
        paddingVertical="$3"
        backgroundColor={isUnread ? "$blue2" : "$background"}
        borderBottomWidth={1}
        borderBottomColor="$gray5"
        alignItems="flex-start"
      >
        <YStack
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor={isUnread ? "$blue4" : "$gray4"}
          alignItems="center"
          justifyContent="center"
          marginTop={2}
        >
          <Icon size={18} color={isUnread ? theme.blue11?.val : theme.gray11?.val} />
        </YStack>

        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2" justifyContent="space-between">
            <Text fontSize="$4" fontWeight={isUnread ? "700" : "500"} numberOfLines={1}>
              {title}
            </Text>
            <Text fontSize="$2" color="$gray10">
              {relative}
            </Text>
          </XStack>
          <Text fontSize="$3" color="$gray11" numberOfLines={2}>
            {item.body}
          </Text>
        </YStack>

        {isUnread && (
          <YStack width={8} height={8} borderRadius={4} backgroundColor="$blue10" marginTop={8} />
        )}
      </XStack>
    </Pressable>
  );
}
