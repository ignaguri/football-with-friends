// @ts-nocheck - Tamagui type recursion workaround
import { MediaGrid } from "@repo/ui";
import { api, useInfiniteQuery } from "@repo/api-client";
import { router, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "@tamagui/lucide-icons";
import { Pressable, RefreshControl, ScrollView } from "react-native";
import { Container, Text, YStack, XStack, Card } from "@repo/ui";
import { formatDisplayDate } from "@repo/shared/utils";
import type { MatchMediaFeedGroup } from "@repo/shared/domain";

export default function MultimediaFeedScreen() {
  const { t } = useTranslation();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ["matchMediaFeed"],
      queryFn: async ({ pageParam }) => {
        const res = await api.api["match-media"].feed.$get({
          query: { cursor: pageParam ?? undefined, limit: "5" },
        });
        if (!res.ok) throw new Error("Failed to load feed");
        return (await res.json()) as {
          groups: MatchMediaFeedGroup[];
          nextCursor: string | null;
        };
      },
      initialPageParam: null as string | null,
      getNextPageParam: (last) => last.nextCursor,
    });

  const groups: MatchMediaFeedGroup[] = data?.pages.flatMap((p) => p.groups) ?? [];

  return (
    <>
      <Stack.Screen options={{ title: t("multimedia.title") }} />
      <Container variant="padded">
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const atBottom =
              layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
            if (atBottom && hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          scrollEventThrottle={200}
        >
          {groups.length === 0 ? (
            <YStack alignItems="center" padding="$6">
              <Text color="$gray11">{t("multimedia.emptyFeed")}</Text>
            </YStack>
          ) : (
            <YStack gap="$4">
              {groups.map((g) => {
                const overflow = Math.max(0, g.totalCount - g.items.length);
                return (
                  <Card key={g.matchId} padding="$3">
                    <Pressable
                      onPress={() =>
                        router.push(`/(tabs)/matches/${g.matchId}/gallery`)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Open gallery for ${formatDisplayDate(g.matchDate, "MMM d")}`}
                    >
                      <XStack justifyContent="space-between" alignItems="center" paddingBottom="$2">
                        <Text fontSize="$3" fontWeight="700" color="$gray12">
                          {formatDisplayDate(g.matchDate, "MMM d").toUpperCase()}
                          {g.fieldName ? ` · ${g.fieldName.toUpperCase()}` : ""}
                        </Text>
                        <ChevronRight size={18} />
                      </XStack>
                    </Pressable>
                    <MediaGrid
                      items={g.items}
                      overlayCount={overflow > 0 ? overflow : null}
                      onItemPress={() =>
                        router.push(`/(tabs)/matches/${g.matchId}/gallery`)
                      }
                    />
                  </Card>
                );
              })}
              {isFetchingNextPage && (
                <YStack padding="$3" alignItems="center">
                  <Text color="$gray11">{t("multimedia.loading")}</Text>
                </YStack>
              )}
            </YStack>
          )}
        </ScrollView>
      </Container>
    </>
  );
}
