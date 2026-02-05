import { Text, XStack, YStack } from "tamagui";
import { Card } from "./Card";
import { UserAvatar } from "./user-avatar";
import { Award } from "@tamagui/lucide-icons";

export interface AwardCardProps {
  criteriaName: string;
  criteriaCode: string;
  criteriaDescription: string;
  topPlayers: Array<{
    userName: string;
    nationality?: string;
    profilePicture?: string;
    voteCount: number;
  }>;
  onPress?: () => void;
}

// Medal colors for top 3
const MEDAL_COLORS = ["$yellow9", "$gray9", "$orange9"];
const MEDAL_BG = ["$yellow2", "$gray2", "$orange2"];

export function AwardCard({
  criteriaName,
  criteriaCode: _criteriaCode,
  criteriaDescription,
  topPlayers,
  onPress,
}: AwardCardProps) {
  return (
    <Card
      variant="outlined"
      pressStyle={onPress ? { opacity: 0.8, scale: 0.98 } : undefined}
      onPress={onPress}
      cursor={onPress ? "pointer" : undefined}
    >
      {/* Award Header */}
      <XStack gap="$2" alignItems="center" marginBottom="$3">
        <YStack
          backgroundColor="$green3"
          padding="$2"
          borderRadius="$3"
        >
          <Award size={20} color="$green10" />
        </YStack>
        <YStack flex={1}>
          <Text fontSize="$5" fontWeight="700" numberOfLines={1}>
            {criteriaName}
          </Text>
          <Text fontSize="$2" color="$gray10" numberOfLines={1}>
            {criteriaDescription}
          </Text>
        </YStack>
      </XStack>

      {/* Top Players */}
      {topPlayers.length === 0 ? (
        <YStack padding="$3" alignItems="center">
          <Text fontSize="$3" color="$gray11" textAlign="center">
            No votes yet
          </Text>
        </YStack>
      ) : (
        <YStack gap="$2">
          {topPlayers.map((player, index) => {
            const medalColor = MEDAL_COLORS[index] || "$blue9";
            const medalBg = MEDAL_BG[index] || "$blue2";

            return (
              <XStack
                key={`${player.userName}-${index}`}
                alignItems="center"
                gap="$2"
                padding="$2"
                backgroundColor={index === 0 ? medalBg : "$background"}
                borderRadius="$2"
              >
                {/* Rank badge */}
                <YStack
                  width={28}
                  height={28}
                  borderRadius={100}
                  backgroundColor={medalBg}
                  borderWidth={2}
                  borderColor={medalColor}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text
                    fontSize="$3"
                    fontWeight="700"
                    color={medalColor}
                  >
                    {index + 1}
                  </Text>
                </YStack>

                {/* Avatar */}
                <UserAvatar
                  name={player.userName}
                  profilePicture={player.profilePicture}
                  countryCode={player.nationality}
                  size={32}
                />

                {/* Name and votes */}
                <YStack flex={1}>
                  <Text fontSize="$4" fontWeight="600" numberOfLines={1}>
                    {player.userName}
                  </Text>
                  <Text fontSize="$2" color="$gray11">
                    {player.voteCount} {player.voteCount === 1 ? "vote" : "votes"}
                  </Text>
                </YStack>
              </XStack>
            );
          })}
        </YStack>
      )}
    </Card>
  );
}
