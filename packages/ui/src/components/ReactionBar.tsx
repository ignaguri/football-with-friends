// @ts-nocheck - Tamagui type recursion workaround
import { REACTION_EMOJIS, type MatchMediaReactionSummary, type ReactionEmoji } from "@repo/shared/domain";
import { XStack, YStack, Text } from "tamagui";
import { Pressable } from "react-native";

export type ReactionBarProps = {
  reactions: MatchMediaReactionSummary[];
  onToggle: (emoji: ReactionEmoji) => void;
  disabled?: boolean;
};

export function ReactionBar({ reactions, onToggle, disabled }: ReactionBarProps) {
  const byEmoji = new Map(reactions.map((r) => [r.emoji, r]));

  return (
    <XStack gap="$2" flexWrap="wrap">
      {REACTION_EMOJIS.map((emoji) => {
        const r = byEmoji.get(emoji) ?? { emoji, count: 0, didReact: false };
        return (
          <Pressable
            key={emoji}
            onPress={() => !disabled && onToggle(emoji)}
            accessibilityRole="button"
            accessibilityLabel={`${emoji} reaction, ${r.count} ${r.count === 1 ? "person" : "people"}`}
          >
            <XStack
              alignItems="center"
              gap="$1"
              paddingHorizontal="$2"
              paddingVertical="$1.5"
              borderRadius="$10"
              backgroundColor={r.didReact ? "$blue4" : "$gray3"}
              borderWidth={1}
              borderColor={r.didReact ? "$blue8" : "$gray5"}
            >
              <Text fontSize="$5">{emoji}</Text>
              {r.count > 0 && (
                <Text fontSize="$3" color={r.didReact ? "$blue11" : "$gray11"}>
                  {r.count}
                </Text>
              )}
            </XStack>
          </Pressable>
        );
      })}
    </XStack>
  );
}
