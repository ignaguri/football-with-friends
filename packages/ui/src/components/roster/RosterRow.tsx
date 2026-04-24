import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { View } from "react-native";

export interface RosterRowProps {
  // Small leading node (country flag, avatar, icon). Rendered inline left of
  // `primary` in the same row.
  leading?: ReactNode;
  // The main identifier content — caller controls its shape (e.g. a YStack of
  // name + username, or a single Text).
  primary: ReactNode;
  // A second row below `primary`, smaller gray text by convention. Caller
  // supplies the full Text node so they own fontSize/color decisions.
  secondary?: ReactNode;
  // Right-aligned column (badge + action buttons).
  trailing?: ReactNode;
  highlighted?: boolean;
  dimmed?: boolean;
  testID?: string;
}

export function RosterRow({
  leading,
  primary,
  secondary,
  trailing,
  highlighted = false,
  dimmed = false,
  testID,
}: RosterRowProps) {
  return (
    <XStack
      testID={testID}
      justifyContent="space-between"
      alignItems="center"
      paddingVertical="$2"
      paddingHorizontal="$3"
      opacity={dimmed ? 0.6 : 1}
      backgroundColor={highlighted ? "$blue2" : "transparent"}
      borderRadius={highlighted ? "$2" : 0}
    >
      <YStack flex={1} gap="$1">
        <XStack gap="$2" alignItems="center">
          {leading}
          {primary}
        </XStack>
        {secondary}
      </YStack>

      {trailing ? <View style={{ alignItems: "flex-end" }}>{trailing}</View> : null}
    </XStack>
  );
}
