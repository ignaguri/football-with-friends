import { useState } from "react";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Spinner,
  Tabs,
  StatusBadge,
  Button,
  type MatchStatusType,
  type PlayerStatusType,
} from "@repo/ui";
import { useInfiniteQuery, client, useSession } from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { router, Stack } from "expo-router";
import { RefreshControl, ScrollView } from "react-native";
import { Plus, BookOpen } from "@tamagui/lucide-icons";
import { Pressable } from "react-native";
import { useTheme } from "tamagui";

type MatchType = "upcoming" | "past";

export default function MatchesListScreen() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<MatchType>("upcoming");

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["matches", activeTab],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await client.api.matches.$get({
        query: {
          type: activeTab,
          limit: "5",
          offset: pageParam.toString(),
        },
      });
      return res.json();
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.page + 1) * 5 : undefined,
    initialPageParam: 0,
  });

  // Flatten paginated data
  const matches = data?.pages.flatMap((page) => page.matches) ?? [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getMatchStatus = (status: string): MatchStatusType | null => {
    switch (status) {
      case "cancelled":
        return "cancelled";
      case "completed":
      case "played":
        return "played";
      case "upcoming":
        return "upcoming";
      default:
        return null;
    }
  };

  const getStatusLabel = (status: MatchStatusType): string => {
    switch (status) {
      case "cancelled":
        return t("status.cancelled");
      case "played":
        return t("status.played");
      case "upcoming":
        return t("status.upcoming");
    }
  };

  const getPlayerStatusLabel = (status: PlayerStatusType): string => {
    switch (status) {
      case "PAID":
        return t("status.paid");
      case "PENDING":
        return t("status.pending");
      case "CANCELLED":
        return t("status.cancelled");
      case "SUBSTITUTE":
        return t("status.substitute");
    }
  };

  const tabs = [
    { value: "upcoming", label: t("matches.upcoming") },
    { value: "past", label: t("matches.past") },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: "Matches",
          headerStyle: {
            backgroundColor: theme.background?.val,
          },
          headerTintColor: theme.color?.val,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/(tabs)/rules")}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <BookOpen size={20} color={theme.color?.val} />
              <Text fontSize="$3" color={theme.color?.val}>
                {t("rules.title")}
              </Text>
            </Pressable>
          ),
        }}
      />
      <Container variant="padded">
      {/* Tab Selector */}
      <YStack marginBottom="$4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as MatchType)}
          tabs={tabs}
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
                    {match.userSignupStatus ? (
                      <StatusBadge
                        status={match.userSignupStatus}
                        type="player"
                        label={getPlayerStatusLabel(match.userSignupStatus)}
                      />
                    ) : (
                      match.status === "upcoming" && getMatchStatus(match.status) && (
                        <StatusBadge
                          status={getMatchStatus(match.status)!}
                          type="match"
                          label={getStatusLabel(getMatchStatus(match.status)!)}
                        />
                      )
                    )}
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
                      <Text fontSize="$4">{match.maxPlayers}</Text>
                    </YStack>
                  </XStack>

                  {match.location?.name && (
                    <Text fontSize="$3" color="$gray11">
                      {match.location.name}
                      {match.court?.name && ` - ${match.court.name}`}
                    </Text>
                  )}
                </YStack>
              </Card>
            ))}

          {/* Load More Button */}
          {!isLoading && !error && hasNextPage && (
            <Button
              variant="outline"
              onPress={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              marginTop="$4"
            >
              {isFetchingNextPage ? <Spinner size="small" /> : t("shared.loadMore")}
            </Button>
          )}
        </YStack>
      </ScrollView>

      {/* Admin FAB */}
      {session?.user?.role === "admin" && (
        <Button
          position="absolute"
          bottom="$6"
          right="$4"
          width={56}
          height={56}
          borderRadius="$12"
          backgroundColor="$blue10"
          onPress={() => router.push("/(tabs)/admin/add-match")}
          pressStyle={{ scale: 0.95 }}
          elevation={4}
          padding="$0"
          justifyContent="center"
          alignItems="center"
        >
          <Plus size={28} color="white" />
        </Button>
      )}
    </Container>
    </>
  );
}
