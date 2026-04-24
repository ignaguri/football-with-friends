import type { ReactNode } from "react";
import { XStack, Text } from "tamagui";
import { RosterSeparator } from "./RosterSeparator";

export interface RosterSectionProps {
  // Optional small gray header shown above the rows (e.g. "Cancelled",
  // "Organizers"). Omit for sections that don't need a heading.
  label?: string;
  children: ReactNode;
  // Render a `RosterSeparator` above this section. Useful for stacking
  // sections without double-managing spacing in the parent.
  showSeparatorBefore?: boolean;
}

export function RosterSection({
  label,
  children,
  showSeparatorBefore = false,
}: RosterSectionProps) {
  return (
    <>
      {showSeparatorBefore && <RosterSeparator />}
      {label ? (
        <XStack
          paddingVertical="$2"
          paddingHorizontal="$3"
          backgroundColor="$gray2"
          marginTop="$2"
        >
          <Text fontSize="$2" color="$gray10" fontWeight="500">
            {label}
          </Text>
        </XStack>
      ) : null}
      {children}
    </>
  );
}
