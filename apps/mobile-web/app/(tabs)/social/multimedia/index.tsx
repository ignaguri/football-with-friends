// @ts-nocheck - Tamagui type recursion workaround
import { api, useInfiniteQuery } from "@repo/api-client";
import { router, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, Play } from "@tamagui/lucide-icons";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { Container, Text, YStack, XStack, Card } from "@repo/ui";
import { formatDisplayDate } from "@repo/shared/utils";
import type { MatchMedia, MatchMediaFeedGroup } from "@repo/shared/domain";

const THUMB_SIZE = 56;
const MAX_THUMBS = 3;

function FeedThumb({ item }: { item: MatchMedia }) {
  const thumbUrl = item.kind === "video" && item.posterUrl ? item.posterUrl : item.url;
  return (
    <View style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 6, overflow: "hidden" }}>
      <Image source={{ uri: thumbUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
      {item.kind === "video" && (
        <View
          style={{
            position: "absolute",
            inset: 0,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
        >
          <Play size={18} color="#fff" />
        </View>
      )}
    </View>
  );
}

// Rendered in place of the 3rd thumbnail when a match has more photos than
// MAX_THUMBS. Solid-colored circle keeps it clearly readable against the
// neighbouring thumbnails, and adapts to theme via $blue8 / $blue11.
function FeedOverflowBadge({ count }: { count: number }) {
  return (
    <YStack
      width={THUMB_SIZE}
      height={THUMB_SIZE}
      borderRadius={THUMB_SIZE / 2}
      backgroundColor="$blue8"
      borderWidth={2}
      borderColor="$background"
      alignItems="center"
      justifyContent="center"
    >
      <Text color="$blue12" fontWeight="700" fontSize="$5">
        +{count}
      </Text>
    </YStack>
  );
}

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
            <YStack gap="$3">
              {groups.map((g) => {
                // When the total fits, show all thumbs with no badge.
                // When it doesn't, give up one thumb slot to the badge so the
                // badge count reflects every photo it's standing in for
                // (including the one whose thumb we're replacing).
                const hasOverflow = g.totalCount > MAX_THUMBS;
                const visibleThumbs = hasOverflow ? MAX_THUMBS - 1 : MAX_THUMBS;
                const displayItems = g.items.slice(0, visibleThumbs);
                const overflow = hasOverflow ? g.totalCount - visibleThumbs : 0;
                return (
                  <Card key={g.matchId} padding="$2">
                    <Pressable
                      onPress={() =>
                        router.push(`/(tabs)/matches/${g.matchId}/gallery`)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Open gallery for ${formatDisplayDate(g.matchDate, "MMM d")}`}
                    >
                      <XStack alignItems="center" gap="$3">
                        <XStack gap={4} alignItems="center">
                          {displayItems.map((item) => (
                            <FeedThumb key={item.id} item={item} />
                          ))}
                          {overflow > 0 && <FeedOverflowBadge count={overflow} />}
                        </XStack>
                        <YStack flex={1}>
                          <Text fontSize="$3" fontWeight="700" color="$gray12">
                            {formatDisplayDate(g.matchDate, "MMM d").toUpperCase()}
                          </Text>
                          {g.fieldName && (
                            <Text fontSize="$2" color="$gray11">
                              {g.fieldName}
                            </Text>
                          )}
                        </YStack>
                        <ChevronRight size={18} color="$gray10" />
                      </XStack>
                    </Pressable>
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
