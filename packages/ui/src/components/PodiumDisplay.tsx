import { Text, XStack, YStack } from "tamagui";
import { UserAvatar } from "./user-avatar";
import { Trophy } from "@tamagui/lucide-icons";
import { getCountryFlag } from "../utils/country-flags";

export interface PodiumDisplayProps {
  rankings: Array<{
    rank: number;
    userName: string;
    nationality?: string;
    profilePicture?: string;
    value: number;
  }>;
  valueLabel: string;
}

// Podium heights for visual hierarchy
const PODIUM_HEIGHTS = {
  1: 120, // 1st place tallest
  2: 90,  // 2nd place medium
  3: 70,  // 3rd place shortest
};

// Podium colors
const PODIUM_COLORS = {
  1: "$yellow9",  // Gold
  2: "$gray9",    // Silver
  3: "$orange9",  // Bronze
};

const PODIUM_BG = {
  1: "$yellow2",
  2: "$gray2",
  3: "$orange2",
};

interface PodiumSpotProps {
  rank: number;
  userName: string;
  nationality?: string;
  profilePicture?: string;
  value: number;
  valueLabel: string;
}

function PodiumSpot({
  rank,
  userName,
  nationality,
  profilePicture,
  value,
  valueLabel,
}: PodiumSpotProps) {
  const height = PODIUM_HEIGHTS[rank as 1 | 2 | 3];
  const color = PODIUM_COLORS[rank as 1 | 2 | 3];
  const bg = PODIUM_BG[rank as 1 | 2 | 3];
  const avatarSize = rank === 1 ? 72 : 56;

  return (
    <YStack alignItems="center" flex={1} gap="$2">
      {/* Avatar with trophy for 1st place */}
      <YStack position="relative" alignItems="center" marginBottom="$2">
        <UserAvatar
          name={userName}
          profilePicture={profilePicture}
          size={avatarSize}
        />
        {rank === 1 && (
          <YStack
            position="absolute"
            top={-8}
            right={-8}
            backgroundColor={color}
            borderRadius={100}
            padding="$1.5"
          >
            <Trophy size={16} color="white" />
          </YStack>
        )}
      </YStack>

      {/* Player name */}
      <XStack gap="$1" alignItems="center" justifyContent="center">
        {nationality && (
          <Text fontSize={rank === 1 ? "$5" : "$4"}>
            {getCountryFlag(nationality)}
          </Text>
        )}
        <Text
          fontSize={rank === 1 ? "$5" : "$4"}
          fontWeight={rank === 1 ? "700" : "600"}
          textAlign="center"
          numberOfLines={1}
        >
          {userName}
        </Text>
      </XStack>

      {/* Value */}
      <Text fontSize="$3" color="$gray11" textAlign="center">
        {value} {valueLabel}
      </Text>

      {/* Podium base */}
      <YStack
        width="100%"
        height={height}
        backgroundColor={bg}
        borderTopLeftRadius="$3"
        borderTopRightRadius="$3"
        borderWidth={2}
        borderBottomWidth={0}
        borderColor={color}
        justifyContent="center"
        alignItems="center"
      >
        <Text fontSize="$8" fontWeight="800" color={color}>
          {rank}
        </Text>
      </YStack>
    </YStack>
  );
}

export function PodiumDisplay({ rankings, valueLabel }: PodiumDisplayProps) {
  // Extract top 3
  const first = rankings.find((r) => r.rank === 1);
  const second = rankings.find((r) => r.rank === 2);
  const third = rankings.find((r) => r.rank === 3);

  if (!first && !second && !third) {
    return (
      <YStack padding="$4" alignItems="center">
        <Text color="$gray11" textAlign="center">
          No rankings available yet
        </Text>
      </YStack>
    );
  }

  return (
    <XStack
      gap="$2"
      justifyContent="center"
      alignItems="flex-end"
      paddingHorizontal="$3"
      paddingTop="$4"
      paddingBottom="$2"
    >
      {/* 2nd place (left) */}
      {second && (
        <PodiumSpot
          rank={2}
          userName={second.userName}
          nationality={second.nationality}
          profilePicture={second.profilePicture}
          value={second.value}
          valueLabel={valueLabel}
        />
      )}

      {/* 1st place (center, elevated) */}
      {first && (
        <PodiumSpot
          rank={1}
          userName={first.userName}
          nationality={first.nationality}
          profilePicture={first.profilePicture}
          value={first.value}
          valueLabel={valueLabel}
        />
      )}

      {/* 3rd place (right) */}
      {third && (
        <PodiumSpot
          rank={3}
          userName={third.userName}
          nationality={third.nationality}
          profilePicture={third.profilePicture}
          value={third.value}
          valueLabel={valueLabel}
        />
      )}
    </XStack>
  );
}
