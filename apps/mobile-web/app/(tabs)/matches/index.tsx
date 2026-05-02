import { useInfiniteQuery, client, useSession, useCurrentGroup } from "@repo/api-client";
import { Container, Card, Text, YStack, XStack, Spinner, Tabs, Button } from "@repo/ui";
import { Plus, BookOpen } from "@tamagui/lucide-icons-2";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView } from "react-native";
import { formatMatchDateTime } from "../../../lib/date-utils";

type MatchType = "upcoming" | "past";

export default function MatchesListScreen() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { myRole } = useCurrentGroup();
  const canManage = session?.user?.role === "admin" || myRole === "organizer";
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
    getNextPageParam: (lastPage) => (lastPage.hasMore ? (lastPage.page + 1) * 5 : undefined),
    initialPageParam: 0,
  });

  // Flatten paginated data
  const matches = data?.pages.flatMap((page) => page.matches) ?? [];

  const tabs = [
    { value: "upcoming", label: t("matches.upcoming") },
    { value: "past", label: t("matches.past") },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerShown: true,
          headerRight: () => (
            <Button
              variant="ghost"
              size="$3"
              onPress={() => router.push("/(tabs)/rules")}
              paddingHorizontal="$3"
              accessibilityLabel={t("a11y.viewRules")}
              testID="matches-rules-btn"
            >
              <XStack gap="$2" alignItems="center">
                <BookOpen size={20} />
                <Text fontSize="$4">{t("rules.title")}</Text>
              </XStack>
            </Button>
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
            testIDPrefix="matches-tab"
          />
        </YStack>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
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
              matches.map((match) => {
                const dateTime = formatMatchDateTime(match.date, match.time);
                return (
                  <YStack
                    key={match.id}
                    onPress={() => router.push(`/(tabs)/matches/${match.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      match.location?.name
                        ? t("a11y.openMatch", {
                            date: dateTime,
                            location: match.location.name,
                          })
                        : t("a11y.openMatchNoLocation", { date: dateTime })
                    }
                    testID={`matches-card-${match.id}`}
                    width="100%"
                    backgroundColor="$brandNavy"
                    borderRadius={16}
                    padding="$4"
                    gap="$1"
                    cursor="pointer"
                    pressStyle={{ scale: 0.98, opacity: 0.9 }}
                    $platform-web={{
                      // @ts-ignore - boxShadow is web-only, reads a theme-scoped CSS var
                      boxShadow: "0px 4px 8px var(--shadow3)",
                    }}
                  >
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack>
                        <Text color="white" fontSize="$5" fontWeight="500" textAlign="left">
                          {dateTime}
                        </Text>
                        {match.location?.name && (
                          <Text color="white" fontSize="$5" fontWeight="600" textAlign="left">
                            {match.location.name}
                          </Text>
                        )}
                      </YStack>
                      {(match as any).userSignupStatus &&
                        (match as any).userSignupStatus !== "CANCELLED" && (
                          <Text
                            fontSize="$2"
                            fontWeight="600"
                            color="white"
                            backgroundColor="$brandNavyOverlay"
                            paddingHorizontal="$2"
                            paddingVertical="$1"
                            borderRadius="$2"
                          >
                            {activeTab === "upcoming"
                              ? t("matches.youJoined")
                              : t("matches.youPlayed")}
                          </Text>
                        )}
                    </XStack>
                  </YStack>
                );
              })}

            {/* Load More Button */}
            {!isLoading && !error && hasNextPage && (
              <Button
                variant="outline"
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                marginTop="$4"
                accessibilityLabel={t("a11y.loadMoreMatches")}
                testID="matches-load-more"
              >
                {isFetchingNextPage ? <Spinner size="small" /> : t("shared.loadMore")}
              </Button>
            )}
          </YStack>
        </ScrollView>

        {/* Admin FAB — visible to platform admins and group organizers */}
        {canManage && (
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
            accessibilityLabel={t("a11y.addMatch")}
            testID="matches-fab-add"
          >
            <Plus size={28} color="white" />
          </Button>
        )}
      </Container>
    </>
  );
}
