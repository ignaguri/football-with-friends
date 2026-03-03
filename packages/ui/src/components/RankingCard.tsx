import { Text, XStack, YStack, Circle } from "tamagui";
import { Card } from "./Card";
import { UserAvatar } from "./user-avatar";
import { getCountryFlag } from "../utils/country-flags";

export interface RankingCardProps {
  rank: number;
  userName: string;
  userNickname?: string | null;
  nationality?: string;
  profilePicture?: string;
  value: number;
  valueLabel: string;
  onPress?: () => void;
  isPodium?: boolean; // top 3 get enhanced styling
}

// Get rank badge color based on position
function getRankColor(rank: number): string {
  if (rank === 1) return "$yellow9"; // Gold
  if (rank === 2) return "$gray9"; // Silver
  if (rank === 3) return "$orange9"; // Bronze
  return "$blue9"; // Default
}

// Get rank badge background based on position
function getRankBackground(rank: number): string {
  if (rank === 1) return "$yellow3";
  if (rank === 2) return "$gray3";
  if (rank === 3) return "$orange3";
  return "$blue3";
}

export function RankingCard({
  rank,
  userName,
  userNickname,
  nationality,
  profilePicture,
  value,
  valueLabel,
  onPress,
  isPodium = false,
}: RankingCardProps) {
  const rankColor = getRankColor(rank);
  const rankBg = getRankBackground(rank);
  const avatarSize = isPodium && rank <= 3 ? 56 : 44;

  return (
    <Card
      variant={isPodium && rank <= 3 ? "elevated" : "outlined"}
      pressStyle={onPress ? { opacity: 0.8, scale: 0.98 } : undefined}
      onPress={onPress}
      cursor={onPress ? "pointer" : undefined}
      borderColor={isPodium && rank <= 3 ? rankColor : undefined}
      borderWidth={isPodium && rank <= 3 ? 2 : undefined}
    >
      <XStack alignItems="center" gap="$3">
        {/* Rank Badge */}
        <Circle
          size={isPodium && rank <= 3 ? 48 : 40}
          backgroundColor={rankBg}
          borderWidth={2}
          borderColor={rankColor}
        >
          <Text
            fontSize={isPodium && rank <= 3 ? "$6" : "$5"}
            fontWeight="700"
            color={rankColor}
          >
            {rank}
          </Text>
        </Circle>

        {/* User Avatar */}
        <UserAvatar
          name={userName}
          profilePicture={profilePicture}
          size={avatarSize}
        />

        {/* Player Info */}
        <YStack flex={1} gap="$1">
          <XStack gap="$1.5" alignItems="center">
            {nationality && (
              <Text fontSize={isPodium && rank <= 3 ? "$6" : "$5"}>
                {getCountryFlag(nationality)}
              </Text>
            )}
            <YStack>
              <Text
                fontSize={isPodium && rank <= 3 ? "$6" : "$5"}
                fontWeight={isPodium && rank <= 3 ? "700" : "600"}
              >
                {userNickname ?? userName}
              </Text>
              {userNickname && (
                <Text fontSize="$2" color="$gray10" fontWeight="400">({userName})</Text>
              )}
            </YStack>
          </XStack>
          <Text fontSize="$3" color="$gray11">
            {value} {valueLabel}
          </Text>
        </YStack>
      </XStack>
    </Card>
  );
}
