// @ts-nocheck - Tamagui type recursion workaround
import { useQuery, client } from "@repo/api-client";
import {
  Container,
  Card,
  Text,
  YStack,
  Spinner,
  Input,
  PlayerStatsCard,
  Tabs,
  Select,
  RankingCard,
  PodiumDisplay,
  AwardCard,
} from "@repo/ui";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView } from "react-native";

export default function PlayersStatsScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("players");
  const [selectedCriteria, setSelectedCriteria] = useState("matches");

  const {
    data: players,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const res = await client.api.players.$get();
      return res.json();
    },
  });

  const {
    data: rankings,
    isLoading: isLoadingRankings,
    error: rankingsError,
    refetch: refetchRankings,
    isRefetching: isRefetchingRankings,
  } = useQuery({
    queryKey: ["rankings", selectedCriteria],
    queryFn: async () => {
      const res = await client.api.rankings.$get({
        query: { criteria: selectedCriteria, limit: "50" },
      });
      return res.json();
    },
    enabled: activeTab === "rankings",
  });

  const {
    data: leaderboard,
    isLoading: isLoadingLeaderboard,
    error: leaderboardError,
    refetch: refetchLeaderboard,
    isRefetching: isRefetchingLeaderboard,
  } = useQuery({
    queryKey: ["voting-leaderboard"],
    queryFn: async () => {
      const res = await client.api.voting.leaderboard.$get({
        query: { topN: "3" },
      });
      return res.json();
    },
    enabled: activeTab === "awards",
  });

  const filteredPlayers = players?.filter((player) =>
    player.userName.toLowerCase().includes(search.toLowerCase()) ||
    (player.userNickname?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  const tabs = [
    { value: "players", label: t("social.tabs.players") },
    { value: "rankings", label: t("social.tabs.rankings") },
    { value: "awards", label: t("social.tabs.awards") },
  ];

  const criteriaOptions = [
    { value: "matches", label: t("rankings.criteria.matches") },
    { value: "third_times", label: t("rankings.criteria.third_times") },
    { value: "beers", label: t("rankings.criteria.beers") },
  ];

  return (
    <Container variant="padded">
      {/* Tab Navigation */}
      <YStack marginBottom="$3">
        <Tabs value={activeTab} onValueChange={setActiveTab} tabs={tabs} />
      </YStack>

      {/* Players Tab */}
      {activeTab === "players" && (
        <>
          {/* Search */}
          <YStack marginBottom="$3">
            <Input
              placeholder={t("playerStats.searchPlayers")}
              value={search}
              onChangeText={setSearch}
            />
          </YStack>

          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
          >
            <YStack gap="$3" paddingBottom="$4">
              {isLoading && (
                <YStack alignItems="center" padding="$6">
                  <Spinner size="large" />
                  <Text marginTop="$2" color="$gray11">
                    {t("shared.loading")}
                  </Text>
                </YStack>
              )}

              {error && (
                <Card variant="outlined" backgroundColor="$red2">
                  <YStack padding="$3">
                    <Text color="$red11">{t("shared.error")}</Text>
                  </YStack>
                </Card>
              )}

              {!isLoading &&
                !error &&
                filteredPlayers &&
                filteredPlayers.length === 0 && (
                  <Card variant="outlined">
                    <YStack padding="$4" alignItems="center">
                      <Text fontSize="$5" color="$gray11">
                        {t("playerStats.noPlayers")}
                      </Text>
                    </YStack>
                  </Card>
                )}

              {!isLoading &&
                !error &&
                filteredPlayers &&
                filteredPlayers.map((player) => (
                  <PlayerStatsCard
                    key={player.userId}
                    name={player.userName}
                    userNickname={player.userNickname}
                    nationality={player.nationality}
                    profilePicture={player.profilePicture}
                    totalMatches={player.totalMatches}
                    totalThirdTimes={player.totalThirdTimes}
                    matchesLabel={t("playerStats.totalMatches")}
                    thirdTimesLabel={t("playerStats.thirdTime")}
                    onPress={() =>
                      router.push(`/(tabs)/social/${player.userId}`)
                    }
                  />
                ))}
            </YStack>
          </ScrollView>
        </>
      )}

      {/* Rankings Tab */}
      {activeTab === "rankings" && (
        <>
          {/* Criteria Selector */}
          <YStack marginBottom="$3">
            <Select
              value={selectedCriteria}
              onValueChange={(value) => setSelectedCriteria(value)}
              options={criteriaOptions}
              placeholder={t("rankings.selectCriteria")}
            />
          </YStack>

          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetchingRankings}
                onRefresh={refetchRankings}
              />
            }
          >
            <YStack gap="$3" paddingBottom="$4">
              {isLoadingRankings && (
                <YStack alignItems="center" padding="$6">
                  <Spinner size="large" />
                  <Text marginTop="$2" color="$gray11">
                    {t("shared.loading")}
                  </Text>
                </YStack>
              )}

              {rankingsError && (
                <Card variant="outlined" backgroundColor="$red2">
                  <YStack padding="$3">
                    <Text color="$red11">{t("shared.error")}</Text>
                  </YStack>
                </Card>
              )}

              {!isLoadingRankings &&
                !rankingsError &&
                rankings &&
                rankings.length === 0 && (
                  <Card variant="outlined">
                    <YStack padding="$4" alignItems="center">
                      <Text fontSize="$5" color="$gray11">
                        {t("rankings.noData")}
                      </Text>
                    </YStack>
                  </Card>
                )}

              {!isLoadingRankings &&
                !rankingsError &&
                rankings &&
                rankings.length > 0 && (
                  <>
                    {/* Podium Display for Top 3 */}
                    {rankings.length >= 3 && (
                      <PodiumDisplay
                        rankings={rankings.slice(0, 3).map((r) => ({
                          rank: r.rank,
                          userName: r.userName,
                          userNickname: r.userNickname,
                          nationality: r.nationality,
                          profilePicture: r.profilePicture,
                          value: r.value,
                        }))}
                        valueLabel={
                          criteriaOptions.find(
                            (opt) => opt.value === selectedCriteria,
                          )?.label || ""
                        }
                      />
                    )}

                    {/* Ranking Cards List */}
                    {rankings.map((ranking) => (
                      <RankingCard
                        key={ranking.userId}
                        rank={ranking.rank}
                        userName={ranking.userName}
                        userNickname={ranking.userNickname}
                        nationality={ranking.nationality}
                        profilePicture={ranking.profilePicture}
                        value={ranking.value}
                        valueLabel={
                          criteriaOptions.find(
                            (opt) => opt.value === selectedCriteria,
                          )?.label || ""
                        }
                        onPress={() =>
                          router.push(`/(tabs)/social/${ranking.userId}`)
                        }
                        isPodium={ranking.rank <= 3}
                      />
                    ))}
                  </>
                )}
            </YStack>
          </ScrollView>
        </>
      )}

      {/* Awards Tab */}
      {activeTab === "awards" && (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingLeaderboard}
              onRefresh={refetchLeaderboard}
            />
          }
        >
          <YStack gap="$3" paddingBottom="$4">
            {isLoadingLeaderboard && (
              <YStack alignItems="center" padding="$6">
                <Spinner size="large" />
                <Text marginTop="$2" color="$gray11">
                  {t("shared.loading")}
                </Text>
              </YStack>
            )}

            {leaderboardError && (
              <Card variant="outlined" backgroundColor="$red2">
                <YStack padding="$3">
                  <Text color="$red11">{t("shared.error")}</Text>
                </YStack>
              </Card>
            )}

            {!isLoadingLeaderboard &&
              !leaderboardError &&
              leaderboard &&
              leaderboard.criteria.length === 0 && (
                <Card variant="outlined">
                  <YStack padding="$4" alignItems="center">
                    <Text fontSize="$5" color="$gray11">
                      {t("awards.noVotes")}
                    </Text>
                  </YStack>
                </Card>
              )}

            {!isLoadingLeaderboard &&
              !leaderboardError &&
              leaderboard &&
              leaderboard.criteria.map((award) => (
                <AwardCard
                  key={award.criteriaId}
                  criteriaName={award.criteriaName}
                  criteriaCode={award.criteriaCode}
                  criteriaDescription={award.criteriaDescription}
                  topPlayers={award.topPlayers.map((player) => ({
                    userName: player.userName,
                    userNickname: player.userNickname,
                    nationality: player.nationality,
                    profilePicture: player.profilePicture,
                    voteCount: player.voteCount,
                  }))}
                />
              ))}
          </YStack>
        </ScrollView>
      )}
    </Container>
  );
}
