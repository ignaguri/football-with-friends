import { Text, XStack, YStack } from "tamagui";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { UserAvatar } from "./user-avatar";

export interface PlayerStatsCardProps {
  name: string;
  email?: string;
  nationality?: string;
  profilePicture?: string;
  totalMatches: number;
  totalGoals: number;
  totalThirdTimes: number;
  onPress?: () => void;
  matchesLabel?: string;
  goalsLabel?: string;
  thirdTimesLabel?: string;
}

export function PlayerStatsCard({
  name,
  email,
  nationality,
  profilePicture,
  totalMatches,
  totalGoals,
  totalThirdTimes,
  onPress,
  matchesLabel = "Matches",
  goalsLabel = "Goals",
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
          countryCode={nationality}
          size={44}
        />
        <YStack flex={1} gap="$1">
          <Text fontSize="$5" fontWeight="600">
            {name}
          </Text>
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
        <Badge variant="success">
          {totalGoals} {goalsLabel}
        </Badge>
        <Badge variant="warning">
          {totalThirdTimes} {thirdTimesLabel}
        </Badge>
      </XStack>
    </Card>
  );
}
