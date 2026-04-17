// @ts-nocheck - Tamagui type recursion workaround
import type { MatchMedia, ReactionEmoji } from "@repo/shared/domain";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { X, ChevronLeft, ChevronRight, MoreVertical, Trash2 } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { Modal, View, useWindowDimensions } from "react-native";
import { XStack, YStack, Text } from "tamagui";
import { ReactionBar } from "./ReactionBar";

// IconChip: a Tamagui-native pressable circular button. Using onPress +
// pressStyle on the YStack (rather than wrapping in RN's <Pressable>) keeps
// the whole subtree inside Tamagui's compiler scope — atomic RN Web classes
// (css-view-g5y9jx) are zapped to transparent by an !important reset rule and
// Tamagui's flattened classes are the ones that win.
function IconChip({
  onPress,
  children,
  accessibilityLabel,
  style,
}: {
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel: string;
  style?: object;
}) {
  return (
    <YStack
      onPress={onPress}
      role="button"
      aria-label={accessibilityLabel}
      width={40}
      height={40}
      borderRadius={20}
      backgroundColor="$color4"
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      pressStyle={{ backgroundColor: "$color5" }}
      hoverStyle={{ backgroundColor: "$color5" }}
      style={style}
    >
      {children}
    </YStack>
  );
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (visible) setIndex(startIndex);
  }, [visible, startIndex]);

  // Close the action menu whenever the user navigates to a different item or
  // the lightbox itself closes — prevents a stale menu hovering over the wrong
  // media.
  useEffect(() => {
    setMenuOpen(false);
  }, [index, visible]);

  if (!visible || items.length === 0) return null;
  const item = items[Math.max(0, Math.min(index, items.length - 1))];
  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* nativeID becomes `id` on web. Paired with a selector override in
          apps/mobile-web/global.css so the backdrop defeats the project's
          .css-view-g5y9jx { background: transparent !important } reset when
          Tamagui's compiler can't flatten this tree. */}
      <YStack nativeID="media-lightbox-overlay" flex={1} backgroundColor="$background">
        <IconChip
          onPress={onClose}
          accessibilityLabel="Close"
          style={{ position: "absolute", top: 24, right: 16, zIndex: 10 }}
        >
          <X size={24} color="$color" />
        </IconChip>

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

        {canPrev && (
          <IconChip
            onPress={() => setIndex((i) => i - 1)}
            accessibilityLabel="Previous"
            style={{ position: "absolute", left: 8, top: "50%", zIndex: 10 }}
          >
            <ChevronLeft size={24} color="$color" />
          </IconChip>
        )}
        {canNext && (
          <IconChip
            onPress={() => setIndex((i) => i + 1)}
            accessibilityLabel="Next"
            style={{ position: "absolute", right: 8, top: "50%", zIndex: 10 }}
          >
            <ChevronRight size={24} color="$color" />
          </IconChip>
        )}

        {/* Footer */}
        <YStack nativeID="media-lightbox-footer" padding="$3" gap="$2" backgroundColor="$backgroundHover">
          <XStack alignItems="center" justifyContent="space-between">
            <YStack flex={1}>
              <Text color="$color" fontSize="$4" fontWeight="600">
                {item.uploaderName}
              </Text>
              <Text color="$gray11" fontSize="$2">
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </YStack>
            {canDelete(item) && onDelete && (
              <YStack position="relative">
                <IconChip
                  onPress={() => setMenuOpen((o) => !o)}
                  accessibilityLabel="More actions"
                >
                  <MoreVertical size={22} color="$color" />
                </IconChip>
                {menuOpen && (
                  <YStack
                    nativeID="media-lightbox-menu"
                    position="absolute"
                    bottom={48}
                    right={0}
                    minWidth={180}
                    backgroundColor="$background"
                    borderRadius="$3"
                    borderWidth={1}
                    borderColor="$borderColor"
                    padding="$1"
                    gap="$1"
                    // elevation + shadowColor for native, translated to box-shadow on web
                    elevation={5}
                    shadowColor="$shadowColor"
                    shadowOffset={{ width: 0, height: 2 }}
                    shadowOpacity={0.2}
                    shadowRadius={8}
                    zIndex={20}
                  >
                    <XStack
                      onPress={() => {
                        setMenuOpen(false);
                        onDelete(item);
                      }}
                      role="menuitem"
                      aria-label="Delete"
                      cursor="pointer"
                      hoverStyle={{ backgroundColor: "$red4" }}
                      pressStyle={{ backgroundColor: "$red5" }}
                      padding="$2"
                      gap="$2"
                      alignItems="center"
                      borderRadius="$2"
                    >
                      <Trash2 size={18} color="$red10" />
                      <Text color="$red10" fontSize="$3">
                        Delete
                      </Text>
                    </XStack>
                  </YStack>
                )}
              </YStack>
            )}
          </XStack>
          {item.caption && (
            <Text color="$gray11" fontSize="$3">
              {item.caption}
            </Text>
          )}
          <ReactionBar
            reactions={item.reactions}
            onToggle={(emoji) => onToggleReaction(item, emoji)}
          />
        </YStack>
      </YStack>
    </Modal>
  );
}
