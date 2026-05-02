import type { ComponentType } from "react";
import { Text, XStack, type XStackProps } from "tamagui";
import {
  CalendarPlus,
  CalendarCheck,
  CalendarX,
  Calendar,
  Clock,
} from "@tamagui/lucide-icons-2";

export type PlayerStatusType = "PENDING" | "PAID" | "CANCELLED" | "SUBSTITUTE";
export type MatchStatusType = "upcoming" | "cancelled" | "played";

interface StatusConfig {
  backgroundColor: string;
  textColor: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
}

const PLAYER_STATUS_CONFIG: Record<PlayerStatusType, StatusConfig> = {
  PENDING: {
    backgroundColor: "$yellow4",
    textColor: "$yellow11",
    Icon: CalendarPlus,
  },
  PAID: {
    backgroundColor: "$green4",
    textColor: "$green11",
    Icon: CalendarCheck,
  },
  CANCELLED: {
    backgroundColor: "$red4",
    textColor: "$red11",
    Icon: CalendarX,
  },
  SUBSTITUTE: {
    backgroundColor: "$blue4",
    textColor: "$blue11",
    Icon: Clock,
  },
};

const MATCH_STATUS_CONFIG: Record<MatchStatusType, StatusConfig> = {
  upcoming: {
    backgroundColor: "$blue4",
    textColor: "$blue11",
    Icon: Calendar,
  },
  cancelled: {
    backgroundColor: "$red4",
    textColor: "$red11",
    Icon: CalendarX,
  },
  played: {
    backgroundColor: "$gray4",
    textColor: "$gray11",
    Icon: CalendarCheck,
  },
};

export interface StatusBadgeProps extends Omit<XStackProps, "children"> {
  status: PlayerStatusType | MatchStatusType;
  type?: "player" | "match";
  showIcon?: boolean;
  label?: string;
}

export function StatusBadge({
  status,
  type = "player",
  showIcon = true,
  label,
  ...props
}: StatusBadgeProps) {
  const config =
    type === "player"
      ? PLAYER_STATUS_CONFIG[status as PlayerStatusType]
      : MATCH_STATUS_CONFIG[status as MatchStatusType];

  if (!config) {
    return null;
  }

  const { Icon, backgroundColor, textColor } = config;

  return (
    <XStack
      paddingHorizontal="$2.5"
      paddingVertical="$1.5"
      borderRadius="$2"
      alignItems="center"
      gap="$1.5"
      backgroundColor={backgroundColor}
      {...props}
    >
      {showIcon && <Icon size={14} color={textColor} />}
      <Text fontSize="$2" fontWeight="600" color={textColor}>
        {label || status}
      </Text>
    </XStack>
  );
}
