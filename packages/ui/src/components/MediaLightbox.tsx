// @ts-nocheck - Tamagui type recursion workaround
import type { MatchMedia, ReactionEmoji } from "@repo/shared/domain";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { X, ChevronLeft, ChevronRight, MoreVertical } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";
import { XStack, YStack, Text } from "tamagui";
import { ReactionBar } from "./ReactionBar";

export type MediaLightboxProps = {
  items: MatchMedia[];
  startIndex: number;
  visible: boolean;
  onClose: () => void;
  onToggleReaction: (item: MatchMedia, emoji: ReactionEmoji) => void;
  onDelete?: (item: MatchMedia) => void;
  canDelete: (item: MatchMedia) => boolean;
};

// Isolated sub-component so useVideoPlayer gets a fresh player per item.
function VideoPlayback({ uri, width, height }: { uri: string; width: number; height: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      style={{ width, height }}
      player={player}
      contentFit="contain"
      nativeControls
      allowsFullscreen
    />
  );
}

export function MediaLightbox({
  items,
  startIndex,
  visible,
  onClose,
  onToggleReaction,
  onDelete,
  canDelete,
}: MediaLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (visible) setIndex(startIndex);
  }, [visible, startIndex]);

  if (!visible || items.length === 0) return null;
  const item = items[Math.max(0, Math.min(index, items.length - 1))];
  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
        {/* Close */}
        <Pressable
          onPress={onClose}
          style={{ position: "absolute", top: 40, right: 16, zIndex: 10, padding: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={28} color="#fff" />
        </Pressable>

        {/* Media */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          {item.kind === "photo" ? (
            <Image
              source={{ uri: item.url }}
              style={{ width, height: height * 0.7 }}
              contentFit="contain"
              transition={150}
            />
          ) : (
            <VideoPlayback uri={item.url} width={width} height={height * 0.7} />
          )}
        </View>

        {/* Prev/Next */}
        {canPrev && (
          <Pressable
            onPress={() => setIndex((i) => i - 1)}
            style={{ position: "absolute", left: 8, top: "50%", padding: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Previous"
          >
            <ChevronLeft size={32} color="#fff" />
          </Pressable>
        )}
        {canNext && (
          <Pressable
            onPress={() => setIndex((i) => i + 1)}
            style={{ position: "absolute", right: 8, top: "50%", padding: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Next"
          >
            <ChevronRight size={32} color="#fff" />
          </Pressable>
        )}

        {/* Footer */}
        <YStack padding="$3" gap="$2" backgroundColor="rgba(0,0,0,0.6)">
          <XStack alignItems="center" justifyContent="space-between">
            <YStack flex={1}>
              <Text color="#fff" fontSize="$4" fontWeight="600">
                {item.uploaderName}
              </Text>
              <Text color="#aaa" fontSize="$2">
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </YStack>
            {canDelete(item) && onDelete && (
              <Pressable
                onPress={() => onDelete(item)}
                accessibilityRole="button"
                accessibilityLabel="Delete"
                style={{ padding: 8 }}
              >
                <MoreVertical size={22} color="#fff" />
              </Pressable>
            )}
          </XStack>
          {item.caption && (
            <Text color="#ddd" fontSize="$3">
              {item.caption}
            </Text>
          )}
          <ReactionBar
            reactions={item.reactions}
            onToggle={(emoji) => onToggleReaction(item, emoji)}
          />
        </YStack>
      </View>
    </Modal>
  );
}
