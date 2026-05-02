import type { SpinnerProps} from "tamagui";
import { Spinner as TamaguiSpinner, YStack, Text } from "tamagui";

export interface CustomSpinnerProps extends SpinnerProps {
  label?: string;
}

export function Spinner({
  label,
  size = "large",
  color = "$blue10",
  ...props
}: CustomSpinnerProps) {
  if (!label) {
    return <TamaguiSpinner size={size} color={color} {...props} />;
  }

  return (
    <YStack gap="$3" alignItems="center" backgroundColor="transparent">
      <TamaguiSpinner size={size} color={color} {...props} />
      <Text fontSize="$3" color="$gray11">
        {label}
      </Text>
    </YStack>
  );
}
