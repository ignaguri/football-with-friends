import { Text, XStack, YStack } from "tamagui";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { UserAvatar } from "./user-avatar";
import { getCountryFlag } from "../utils/country-flags";

export interface PlayerStatsCardProps {
  name: string;
  userNickname?: string | null;
  email?: string;
  nationality?: string;
  profilePicture?: string;
  totalMatches: number;
  totalThirdTimes: number;
  onPress?: () => void;
  matchesLabel?: string;
  thirdTimesLabel?: string;
}

export function PlayerStatsCard({
  name,
  userNickname,
  email,
  nationality,
  profilePicture,
  totalMatches,
  totalThirdTimes,
  onPress,
  matchesLabel = "Matches",
  thirdTimesLabel = "3rd Half",
}: PlayerStatsCardProps) {
  return (
    <Card
      variant="outlined"
      pressStyle={onPress ? { opacity: 0.8, scale: 0.98 } : undefined}
      onPress={onPress}
      cursor={onPress ? "pointer" : undefined}
    >
      <XStack alignItems="center" gap="$3">
        <UserAvatar
          name={name}
          profilePicture={profilePicture}
          size={44}
        />
        <YStack flex={1} gap="$1">
          <XStack gap="$1.5" alignItems="center">
            {nationality && (
              <Text fontSize="$5">{getCountryFlag(nationality)}</Text>
            )}
            <YStack>
              <Text fontSize="$5" fontWeight="600">
                {userNickname ?? name}
              </Text>
              {userNickname && (
                <Text fontSize="$2" color="$gray10" fontWeight="400">({name})</Text>
              )}
            </YStack>
          </XStack>
          {email && (
            <Text fontSize="$2" color="$gray10">
              {email}
            </Text>
          )}
        </YStack>
      </XStack>
      <XStack marginTop="$3" gap="$2" flexWrap="wrap">
        <Badge variant="info">
          {totalMatches} {matchesLabel}
        </Badge>
        <Badge variant="warning">
          {totalThirdTimes} {thirdTimesLabel}
        </Badge>
      </XStack>
    </Card>
  );
}
