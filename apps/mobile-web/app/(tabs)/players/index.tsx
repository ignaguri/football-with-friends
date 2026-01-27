// @ts-nocheck - Tamagui type recursion workaround
import { useState } from "react";
import {
  Container,
  Card,
  Text,
  YStack,
  Spinner,
  Input,
  PlayerStatsCard,
} from "@repo/ui";
import { useQuery, client } from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { RefreshControl, ScrollView } from "react-native";

export default function PlayersListScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

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

  const filteredPlayers = players?.filter((player) =>
    player.userName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Container variant="padded">
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
                <Text color="$red11">
                  {t("shared.error")}
                </Text>
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
                email={player.userEmail}
                nationality={player.nationality}
                profilePicture={player.profilePicture}
                totalMatches={player.totalMatches}
                totalGoals={player.totalGoals}
                totalThirdTimes={player.totalThirdTimes}
                matchesLabel={t("playerStats.totalMatches")}
                goalsLabel={t("playerStats.goals")}
                thirdTimesLabel={t("playerStats.thirdTime")}
                onPress={() =>
                  router.push(`/(tabs)/players/${player.userId}`)
                }
              />
            ))}
        </YStack>
      </ScrollView>
    </Container>
  );
}
