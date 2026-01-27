// @ts-nocheck - Tamagui type recursion workaround
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
} from "@repo/ui";
import { useQuery, client, useSession } from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView } from "react-native";

interface MatchPlayerStat {
  id: string;
  matchId: string;
  userId: string;
  goals: number;
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
  totalGoals: number;
  totalThirdTimeAttendances: number;
  totalBeers: number;
  matchStats: MatchPlayerStat[];
}

export default function MyStatsScreen() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const {
    data: profile,
    isLoading,
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (!userId || isLoading) {
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

  return (
    <Container variant="padded">
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <YStack gap="$4" paddingBottom="$6">
          {/* Profile Header */}
          {profile && (
            <Card variant="elevated">
              <YStack padding="$4" alignItems="center" gap="$3">
                <UserAvatar
                  name={profile.user.name}
                  countryCode={profile.user.nationality}
                  size={64}
                />
                <Text fontSize="$7" fontWeight="700">
                  {profile.user.name}
                </Text>
                <Text fontSize="$3" color="$gray10">
                  {profile.user.email}
                </Text>
              </YStack>
            </Card>
          )}

          {/* Aggregate Stats */}
          {profile && (
            <Card variant="elevated">
              <YStack padding="$4" gap="$3">
                <StatsSummary
                  stats={[
                    {
                      label: t("playerStats.totalMatches"),
                      value: profile.totalMatchesPlayed,
                      color: "$blue10",
                    },
                    {
                      label: t("playerStats.totalGoals"),
                      value: profile.totalGoals,
                      color: "$green10",
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
          )}

          {/* Per-Match Stats */}
          {profile && (
            <YStack gap="$3">
              <H2 fontSize="$5" fontWeight="600">
                {t("playerStats.matchHistory")}
              </H2>

              {(!profile.matchStats || profile.matchStats.length === 0) && (
                <Card variant="outlined">
                  <YStack padding="$4" alignItems="center">
                    <Text fontSize="$4" color="$gray11">
                      {t("playerStats.noStats")}
                    </Text>
                  </YStack>
                </Card>
              )}

              {profile.matchStats?.map((stat) => (
                <Card key={stat.id || stat.matchId} variant="outlined">
                  <YStack padding="$3" gap="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack>
                        <Text fontSize="$4" fontWeight="600">
                          {formatDate(stat.match?.date || stat.createdAt)}
                        </Text>
                        {stat.match?.location?.name && (
                          <Text fontSize="$2" color="$gray10">
                            {stat.match.location.name}
                            {stat.match.court?.name ? ` - ${stat.match.court.name}` : ""}
                          </Text>
                        )}
                      </YStack>
                    </XStack>

                    <XStack gap="$4" paddingTop="$2" borderTopWidth={1} borderTopColor="$gray4">
                      <YStack alignItems="center" flex={1}>
                        <Text fontSize="$6" fontWeight="700" color="$green10">
                          {stat.goals}
                        </Text>
                        <Text fontSize="$1" color="$gray10">
                          {t("playerStats.goals")}
                        </Text>
                      </YStack>
                      <YStack alignItems="center" flex={1}>
                        <Text
                          fontSize="$6"
                          fontWeight="700"
                          color={stat.thirdTimeAttended ? "$orange10" : "$gray8"}
                        >
                          {stat.thirdTimeAttended ? t("playerStats.attended") : "-"}
                        </Text>
                        <Text fontSize="$1" color="$gray10">
                          {t("playerStats.thirdTime")}
                        </Text>
                      </YStack>
                      {stat.thirdTimeAttended && (
                        <YStack alignItems="center" flex={1}>
                          <Text fontSize="$6" fontWeight="700" color="$yellow10">
                            {stat.thirdTimeBeers}
                          </Text>
                          <Text fontSize="$1" color="$gray10">
                            {t("playerStats.beers")}
                          </Text>
                        </YStack>
                      )}
                    </XStack>
                  </YStack>
                </Card>
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </Container>
  );
}
