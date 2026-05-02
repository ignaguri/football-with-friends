import { Text, XStack, YStack } from "tamagui";
import { Badge } from "./Badge";
import { Award, Trophy } from "@tamagui/lucide-icons-2";

export interface VotingStatsSectionProps {
  stats: Array<{
    criteriaName: string;
    criteriaCode: string;
    timesVoted: number;
    rank?: number;
  }>;
  totalVotes: number;
  emptyTitle?: string;
  emptyDescription?: string;
  formatVotes?: (count: number) => string;
  formatTotalVotes?: (count: number) => string;
  overallLabel?: string;
}

export function VotingStatsSection({
  stats,
  totalVotes,
  emptyTitle = "No awards received yet",
  emptyDescription = "Play more matches to earn awards!",
  formatVotes,
  formatTotalVotes,
  overallLabel = "overall",
}: VotingStatsSectionProps) {
  if (stats.length === 0) {
    return (
      <YStack padding="$3" alignItems="center" gap="$2">
        <Award size={32} color="$gray9" />
        <Text fontSize="$4" color="$gray11" textAlign="center">
          {emptyTitle}
        </Text>
        <Text fontSize="$3" color="$gray10" textAlign="center">
          {emptyDescription}
        </Text>
      </YStack>
    );
  }

  // Sort by votes descending
  const sortedStats = [...stats].sort((a, b) => b.timesVoted - a.timesVoted);

  return (
    <YStack gap="$3">
      {/* Total votes summary */}
      <XStack
        padding="$3"
        backgroundColor="$green2"
        borderRadius="$3"
        gap="$2"
        alignItems="center"
        justifyContent="center"
      >
        <Trophy size={20} color="$green10" />
        <Text fontSize="$5" fontWeight="700" color="$green11">
          {formatTotalVotes ? formatTotalVotes(totalVotes) : `${totalVotes} Total ${totalVotes === 1 ? "Vote" : "Votes"}`}
        </Text>
      </XStack>

      {/* Individual criteria breakdown */}
      <YStack gap="$2">
        {sortedStats.map((stat) => {
          const isTopRank = stat.rank && stat.rank <= 3;
          const bgColor = isTopRank
            ? stat.rank === 1
              ? "$yellow2"
              : stat.rank === 2
              ? "$gray2"
              : "$orange2"
            : "$background";

          return (
            <XStack
              key={stat.criteriaCode}
              padding="$3"
              backgroundColor={bgColor}
              borderRadius="$2"
              borderWidth={1}
              borderColor={isTopRank ? "$green7" : "$borderColor"}
              gap="$3"
              alignItems="center"
            >
              {/* Criteria info */}
              <YStack flex={1} gap="$1">
                <Text fontSize="$4" fontWeight="600">
                  {stat.criteriaName}
                </Text>
                <Text fontSize="$2" color="$gray10">
                  {stat.criteriaCode}
                </Text>
              </YStack>

              {/* Vote count and rank */}
              <YStack gap="$1" alignItems="flex-end">
                <Badge variant={isTopRank ? "success" : "info"}>
                  {formatVotes ? formatVotes(stat.timesVoted) : `${stat.timesVoted} ${stat.timesVoted === 1 ? "vote" : "votes"}`}
                </Badge>
                {isTopRank && stat.rank && (
                  <XStack gap="$1" alignItems="center">
                    <Trophy
                      size={12}
                      color={
                        stat.rank === 1
                          ? "$yellow9"
                          : stat.rank === 2
                          ? "$gray9"
                          : "$orange9"
                      }
                    />
                    <Text fontSize="$2" color="$gray11" fontWeight="600">
                      #{stat.rank} {overallLabel}
                    </Text>
                  </XStack>
                )}
              </YStack>
            </XStack>
          );
        })}
      </YStack>
    </YStack>
  );
}
