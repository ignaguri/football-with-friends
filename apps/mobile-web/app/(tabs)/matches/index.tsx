import { useState } from "react";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Spinner,
  Badge,
  Button,
} from "@repo/ui";
import { useQuery, client } from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { RefreshControl, ScrollView } from "react-native";

type MatchType = "upcoming" | "past";

export default function MatchesListScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<MatchType>("upcoming");

  const {
    data: matches,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["matches", activeTab],
    queryFn: async () => {
      const res = await client.api.matches.$get({
        query: { type: activeTab },
      });
      return res.json();
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "cancelled":
        return <Badge variant="destructive">{t("status.cancelled")}</Badge>;
      case "played":
        return <Badge variant="secondary">{t("status.played")}</Badge>;
      default:
        return null;
    }
  };

  return (
    <Container variant="padded">
      {/* Tab Selector */}
      <XStack gap="$2" marginBottom="$4">
        <Button
          flex={1}
          variant={activeTab === "upcoming" ? "primary" : "outline"}
          onPress={() => setActiveTab("upcoming")}
        >
          {t("matches.upcoming")}
        </Button>
        <Button
          flex={1}
          variant={activeTab === "past" ? "primary" : "outline"}
          onPress={() => setActiveTab("past")}
        >
          {t("matches.past")}
        </Button>
      </XStack>

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
                <Text color="$red11">{t("matches.error")}</Text>
              </YStack>
            </Card>
          )}

          {!isLoading && !error && matches && matches.length === 0 && (
            <Card variant="outlined">
              <YStack padding="$4" alignItems="center">
                <Text fontSize="$5" color="$gray11">
                  {t("matches.none")}
                </Text>
              </YStack>
            </Card>
          )}

          {!isLoading &&
            !error &&
            matches &&
            matches.map((match) => (
              <Card
                key={match.id}
                variant="elevated"
                pressStyle={{ scale: 0.98, opacity: 0.9 }}
                onPress={() => router.push(`/(tabs)/matches/${match.id}`)}
              >
                <YStack padding="$3" gap="$2">
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$6" fontWeight="600">
                      {formatDate(match.date)}
                    </Text>
                    {getStatusBadge(match.status)}
                  </XStack>

                  <XStack gap="$4">
                    <YStack>
                      <Text fontSize="$3" color="$gray10">
                        {t("shared.time")}
                      </Text>
                      <Text fontSize="$4">{match.time}</Text>
                    </YStack>

                    <YStack>
                      <Text fontSize="$3" color="$gray10">
                        {t("addMatch.maxPlayers")}
                      </Text>
                      <Text fontSize="$4">{match.max_players}</Text>
                    </YStack>

                    {match.cost_per_player && (
                      <YStack>
                        <Text fontSize="$3" color="$gray10">
                          {t("stats.cost")}
                        </Text>
                        <Text fontSize="$4">{match.cost_per_player}</Text>
                      </YStack>
                    )}
                  </XStack>

                  {match.location_name && (
                    <Text fontSize="$3" color="$gray11">
                      {match.location_name}
                      {match.court_name && ` - ${match.court_name}`}
                    </Text>
                  )}
                </YStack>
              </Card>
            ))}
        </YStack>
      </ScrollView>
    </Container>
  );
}
