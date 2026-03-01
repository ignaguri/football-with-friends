import { Spinner as TamaguiSpinner, SpinnerProps, YStack, Text } from "tamagui";

export interface CustomSpinnerProps extends SpinnerProps {
  label?: string;
}

export function Spinner({
  label,
  size = "large",
  ...props
}: CustomSpinnerProps) {
  return (
    <YStack gap="$3" alignItems="center">
      <TamaguiSpinner size={size} color="$blue10" {...props} />
      {label && (
        <Text fontSize="$3" color="$gray11">
          {label}
        </Text>
      )}
    </YStack>
  );
}
