import type { XStackProps } from "tamagui";
import { Text, XStack } from "tamagui";

export interface BadgeProps extends XStackProps {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
}

export function Badge({ variant = "default", children, ...props }: BadgeProps) {
  const variantStyles = {
    default: {
      backgroundColor: "$gray5",
      color: "$gray12",
    },
    success: {
      backgroundColor: "$green4",
      color: "$green11",
    },
    warning: {
      backgroundColor: "$yellow4",
      color: "$yellow11",
    },
    danger: {
      backgroundColor: "$red4",
      color: "$red11",
    },
    info: {
      backgroundColor: "$blue4",
      color: "$blue11",
    },
  };
  const { color, backgroundColor } = variantStyles[variant];

  return (
    <XStack
      paddingHorizontal="$2.5"
      paddingVertical="$1.5"
      borderRadius="$2"
      alignItems="center"
      backgroundColor={backgroundColor}
      {...props}
    >
      <Text fontSize="$2" fontWeight="600" color={color}>
        {children}
      </Text>
    </XStack>
  );
}
