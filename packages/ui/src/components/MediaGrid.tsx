// @ts-nocheck - Tamagui type recursion workaround
import type { MatchMedia } from "@repo/shared/domain";
import { Image } from "expo-image";
import { Play } from "@tamagui/lucide-icons-2";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { YStack } from "tamagui";

export type MediaGridProps = {
  items: MatchMedia[];
  onItemPress: (item: MatchMedia, index: number) => void;
  columns?: number; // default: 3 on narrow, 4 on wide
  overlayCount?: number | null; // shows "+N" on the last tile if set
};

export function MediaGrid({ items, onItemPress, columns, overlayCount }: MediaGridProps) {
  const { width } = useWindowDimensions();
  const cols = columns ?? (width >= 768 ? 4 : 3);
  const gap = 4;
  const tileSize = (Math.min(width, 800) - gap * (cols + 1)) / cols;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap,
        padding: gap,
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const showOverlay =
          isLast && overlayCount !== null && overlayCount !== undefined && overlayCount > 0;
        const thumbUrl = item.kind === "video" && item.posterUrl ? item.posterUrl : item.url;

        return (
          <Pressable
            key={item.id}
            onPress={() => onItemPress(item, i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={item.caption ?? `${item.kind} by ${item.uploaderName}`}
            style={{ width: tileSize, height: tileSize }}
          >
            <View
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 4,
                overflow: "hidden",
                backgroundColor: "#222",
              }}
            >
              <Image
                source={{ uri: thumbUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={150}
              />
              {item.kind === "video" && !showOverlay && (
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                >
                  <Play size={28} color="#fff" />
                </View>
              )}
              {showOverlay && (
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(0,0,0,0.55)",
                  }}
                >
                  <YStack>
                    {/* @ts-ignore - Tamagui text inside plain View */}
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>
                      +{overlayCount}
                    </Text>
                  </YStack>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
