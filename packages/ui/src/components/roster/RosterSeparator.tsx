import { View as TView } from "tamagui";

// Tamagui's <Separator> renders as zero-height on native, so we use a 1px
// colored View instead — theme-aware via backgroundColor.
export function RosterSeparator() {
  return (
    <TView
      backgroundColor="$borderColor"
      height={1}
      marginHorizontal="$3"
      marginVertical="$1.5"
    />
  );
}
