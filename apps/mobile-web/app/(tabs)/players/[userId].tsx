// @ts-nocheck - Tamagui type recursion workaround
import { useState } from "react";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Spinner,
  Button,
  StatsSummary,
  StatsInputRow,
  Tabs,
  UserAvatar,
  H2,
} from "@repo/ui";
import {
  useQuery,
  useMutation,
  useQueryClient,
  client,
  useSession,
} from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
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

type StatsTab = "goals" | "thirdTime";

export default function PlayerDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<StatsTab>("goals");

  const isAdmin = session?.user?.role === "admin";
  const isSelf = session?.user?.id === userId;
  const canEdit = isAdmin || isSelf;

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

  // Also fetch all matches the user participated in (for stats entry on matches without stats yet)
  const { data: userSignups } = useQuery({
    queryKey: ["user-signups", userId],
    queryFn: async () => {
      // Get all matches to cross-reference with stats
      const res = await client.api.matches.$get({
        query: { type: "past" },
      });
      return res.json();
    },
    enabled: !!userId,
  });

  const recordStatsMutation = useMutation({
    mutationFn: async ({
      matchId,
      data,
    }: {
      matchId: string;
      data: {
        userId: string;
        goals?: number;
        thirdTimeAttended?: boolean;
        thirdTimeBeers?: number;
      };
    }) => {
      const res = await client.api.matches[":id"]["player-stats"].$post({
        param: { id: matchId },
        json: data,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-profile", userId] });
    },
  });

  const updateStatsMutation = useMutation({
    mutationFn: async ({
      matchId,
      targetUserId,
      data,
    }: {
      matchId: string;
      targetUserId: string;
      data: {
        goals?: number;
        thirdTimeAttended?: boolean;
        thirdTimeBeers?: number;
        confirmed?: boolean;
      };
    }) => {
      const res = await client.api.matches[":id"]["player-stats"][
        ":userId"
      ].$patch({
        param: { id: matchId, userId: targetUserId },
        json: data,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-profile", userId] });
    },
  });

  const handleGoalsConfirm = (matchId: string, goals: number) => {
    const existingStat = profile?.matchStats?.find(
      (s) => s.matchId === matchId,
    );
    if (existingStat) {
      updateStatsMutation.mutate({
        matchId,
        targetUserId: userId!,
        data: { goals, confirmed: true },
      });
    } else {
      recordStatsMutation.mutate({
        matchId,
        data: { userId: userId!, goals },
      });
    }
  };

  const handleThirdTimeConfirm = (
    matchId: string,
    beers: number,
    attended: boolean,
  ) => {
    const existingStat = profile?.matchStats?.find(
      (s) => s.matchId === matchId,
    );
    if (existingStat) {
      updateStatsMutation.mutate({
        matchId,
        targetUserId: userId!,
        data: { thirdTimeBeers: beers, thirdTimeAttended: attended },
      });
    } else {
      recordStatsMutation.mutate({
        matchId,
        data: {
          userId: userId!,
          thirdTimeBeers: beers,
          thirdTimeAttended: attended,
        },
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const tabs = [
    { value: "goals", label: t("playerStats.goals") },
    { value: "thirdTime", label: t("playerStats.thirdTime") },
  ];

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

          {/* Stats Tabs */}
          <YStack gap="$3">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as StatsTab)}
              tabs={tabs}
            />

            <Card variant="outlined">
              <YStack padding="$3">
                {activeTab === "goals" && (
                  <YStack gap="$1">
                    <Text fontSize="$4" fontWeight="600" marginBottom="$2">
                      {t("playerStats.goalsPerMatch")}
                    </Text>
                    {(!profile.matchStats ||
                      profile.matchStats.length === 0) && (
                      <Text color="$gray11" padding="$3" textAlign="center">
                        {t("playerStats.noStats")}
                      </Text>
                    )}
                    {profile.matchStats?.map((stat) => (
                      <StatsInputRow
                        key={stat.id || stat.matchId}
                        matchDate={formatDate(stat.match?.date || stat.createdAt)}
                        matchVenue={stat.match?.location?.name}
                        value={stat.goals}
                        confirmed={stat.confirmed}
                        editable={canEdit}
                        confirmLabel={t("playerStats.confirm")}
                        modifyLabel={t("playerStats.modify")}
                        onConfirm={(goals) =>
                          handleGoalsConfirm(stat.matchId, goals)
                        }
                      />
                    ))}
                  </YStack>
                )}

                {activeTab === "thirdTime" && (
                  <YStack gap="$1">
                    <Text fontSize="$4" fontWeight="600" marginBottom="$2">
                      {t("playerStats.thirdTimeDesc")}
                    </Text>
                    {(!profile.matchStats ||
                      profile.matchStats.length === 0) && (
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
                            color={
                              stat.thirdTimeAttended ? "$green10" : "$red10"
                            }
                            fontWeight="500"
                          >
                            {stat.thirdTimeAttended
                              ? t("playerStats.attended")
                              : t("playerStats.notAttended")}
                          </Text>
                          {stat.thirdTimeAttended && (
                            <Text fontSize="$4" fontWeight="700">
                              {stat.thirdTimeBeers}
                            </Text>
                          )}
                          {canEdit && (
                            <Button
                              size="$2"
                              variant="outline"
                              onPress={() =>
                                handleThirdTimeConfirm(
                                  stat.matchId,
                                  stat.thirdTimeBeers + 1,
                                  true,
                                )
                              }
                            >
                              +1
                            </Button>
                          )}
                        </XStack>
                      </XStack>
                    ))}
                  </YStack>
                )}
              </YStack>
            </Card>
          </YStack>
        </YStack>
      </ScrollView>
    </Container>
  );
}
