import { useInfiniteQuery, client, useSession } from "@repo/api-client";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Spinner,
  Tabs,
  Button,
  colors,
} from "@repo/ui";
import { Plus, BookOpen } from "@tamagui/lucide-icons";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView, Pressable } from "react-native";
import { useTheme } from "tamagui";
import { formatMatchDateTime } from "../../../lib/date-utils";

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
          />
        </YStack>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
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
                <Pressable
                  key={match.id}
                  onPress={() => router.push(`/(tabs)/matches/${match.id}`)}
                  style={{ width: "100%" }}
                >
                  <YStack
                    backgroundColor={colors.navyBlue}
                    borderRadius={16}
                    padding="$4"
                    gap="$1"
                    pressStyle={{ scale: 0.98, opacity: 0.9 }}
                    borderWidth={2}
                    borderColor="rgba(0, 0, 0, 0.6)"
                    $platform-web={{
                      // @ts-ignore - boxShadow is web-only
                      boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    <Text color="white" fontSize="$5" fontWeight="500">
                      {formatMatchDateTime(match.date, match.time)}
                    </Text>
                    {match.location?.name && (
                      <Text color="white" fontSize="$4" opacity={0.9}>
                        {match.location.name}
                      </Text>
                    )}
                  </YStack>
                </Pressable>
              ))}

            {/* Load More Button */}
            {!isLoading && !error && hasNextPage && (
              <Button
                variant="outline"
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                marginTop="$4"
              >
                {isFetchingNextPage ? (
                  <Spinner size="small" />
                ) : (
                  t("shared.loadMore")
                )}
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
