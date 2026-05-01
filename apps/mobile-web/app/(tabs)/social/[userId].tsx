// @ts-nocheck - Tamagui type recursion workaround
import { useQuery, client } from "@repo/api-client";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Spinner,
  StatsSummary,
  UserAvatar,
  H2,
  VotingStatsSection,
  getCountryFlag,
} from "@repo/ui";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView } from "react-native";

interface MatchPlayerStat {
  id: string;
  matchId: string;
  userId: string;
  thirdTimeAttended: boolean;
  thirdTimeBeers: number;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
  match?: {
    id: string;
    date: string;
    time: string;
    location?: { name: string };
    court?: { name: string };
  };
}

interface PlayerProfile {
  user: {
    id: string;
    name: string;
    email: string;
    nationality?: string;
  };
  totalMatchesPlayed: number;
  totalThirdTimeAttendances: number;
  totalBeers: number;
  matchStats: MatchPlayerStat[];
}

export default function PlayerDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { t, i18n } = useTranslation();
  const {
    data: profile,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["player-profile", userId],
    queryFn: async () => {
      const res = await client.api.players[":userId"].$get({
        param: { userId: userId! },
      });
      return res.json() as Promise<PlayerProfile>;
    },
    enabled: !!userId,
  });

  // Fetch voting statistics for this player
  const { data: votingStats } = useQuery({
    queryKey: ["player-voting-stats", userId],
    queryFn: async () => {
      const res = await client.api.players[":userId"]["voting-stats"].$get({
        param: { userId: userId! },
      });
      return res.json();
    },
    enabled: !!userId,
  });

  const language = i18n.language === "es" ? "es" : "en";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Container variant="padded">
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
          <Text marginTop="$2" color="$gray11">
            {t("shared.loading")}
          </Text>
        </YStack>
      </Container>
    );
  }

  if (error || !profile) {
    return (
      <Container variant="padded">
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Text color="$red11">{t("shared.error")}</Text>
        </YStack>
      </Container>
    );
  }

  return (
    <Container variant="padded">
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <YStack gap="$4" paddingBottom="$6">
          {/* Player Header */}
          <Card variant="elevated">
            <YStack padding="$4" alignItems="center" gap="$3">
              <UserAvatar name={profile.user.name} size={64} />
              <XStack gap="$2" alignItems="center">
                {profile.user.nationality && (
                  <Text fontSize="$7">
                    {getCountryFlag(profile.user.nationality)}
                  </Text>
                )}
                <Text fontSize="$7" fontWeight="700">
                  {profile.user.name}
                </Text>
              </XStack>
              <Text fontSize="$3" color="$gray10">
                {profile.user.email}
              </Text>
            </YStack>
          </Card>

          {/* Aggregate Stats */}
          <Card variant="elevated">
            <YStack padding="$4" gap="$3">
              <H2 fontSize="$5" fontWeight="600">
                {t("playerStats.statistics")}
              </H2>
              <StatsSummary
                stats={[
                  {
                    label: t("playerStats.totalMatches"),
                    value: profile.totalMatchesPlayed,
                    color: "$blue10",
                  },
                  {
                    label: t("playerStats.totalThirdTimes"),
                    value: profile.totalThirdTimeAttendances,
                    color: "$orange10",
                  },
                  {
                    label: t("playerStats.totalBeers"),
                    value: profile.totalBeers,
                    color: "$yellow10",
                  },
                ]}
              />
            </YStack>
          </Card>

          {/* 3rd Time Stats */}
          <Card variant="outlined">
            <YStack padding="$3">
              <YStack gap="$1">
                <Text fontSize="$4" fontWeight="600" marginBottom="$2">
                  {t("playerStats.thirdTimeDesc")}
                </Text>
                {(!profile.matchStats || profile.matchStats.length === 0) && (
                  <Text color="$gray11" padding="$3" textAlign="center">
                    {t("playerStats.noStats")}
                  </Text>
                )}
                {profile.matchStats?.map((stat) => (
                  <XStack
                    key={stat.id || stat.matchId}
                    alignItems="center"
                    padding="$2"
                    borderBottomWidth={1}
                    borderBottomColor="$gray5"
                    gap="$2"
                  >
                    <YStack flex={1} gap="$1">
                      <Text fontSize="$3" fontWeight="500">
                        {formatDate(stat.match?.date || stat.createdAt)}
                      </Text>
                      {stat.match?.location?.name && (
                        <Text fontSize="$2" color="$gray10">
                          {stat.match.location.name}
                        </Text>
                      )}
                    </YStack>
                    <XStack alignItems="center" gap="$2">
                      <Text
                        fontSize="$2"
                        color={stat.thirdTimeAttended ? "$green10" : "$red10"}
                        fontWeight="500"
                      >
                        {stat.thirdTimeAttended
                          ? t("playerStats.attended")
                          : t("playerStats.notAttended")}
                      </Text>
                      {stat.thirdTimeAttended && stat.thirdTimeBeers > 0 && (
                        <Text fontSize="$4" fontWeight="700">
                          🍺 {stat.thirdTimeBeers}
                        </Text>
                      )}
                    </XStack>
                  </XStack>
                ))}
              </YStack>
            </YStack>
          </Card>

          {/* Awards & Recognition */}
          {votingStats && votingStats.totalVotesReceived > 0 && (
            <Card variant="elevated">
              <YStack padding="$4" gap="$3">
                <H2 fontSize="$5" fontWeight="600">
                  {t("playerStats.awardsSection")}
                </H2>
                <VotingStatsSection
                  stats={votingStats.criteriaBreakdown.map((stat: any) => ({
                    ...stat,
                    criteriaName: t(`voting.criteria.${stat.criteriaCode}`, {
                      defaultValue: stat.criteriaName,
                    }),
                  }))}
                  totalVotes={votingStats.totalVotesReceived}
                  emptyTitle={t("awards.noAwardsYet")}
                  emptyDescription={t("awards.playMoreMatches")}
                  formatVotes={(count) => t("awards.votesCount", { count })}
                  formatTotalVotes={(count) =>
                    t("awards.totalVotes", { count })
                  }
                  overallLabel={t("awards.rankOverall")}
                />
              </YStack>
            </Card>
          )}
        </YStack>
      </ScrollView>
    </Container>
  );
}
