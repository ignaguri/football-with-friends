import type { YStackProps } from "tamagui";
import { YStack } from "tamagui";

export interface ContainerProps extends YStackProps {
  variant?: "default" | "centered" | "padded";
}

export function Container({ variant = "default", ...props }: ContainerProps) {
  const variantStyles = {
    default: {
      flex: 1,
      width: "100%",
      maxWidth: 1200,
      marginHorizontal: "auto" as const,
    },
    centered: {
      flex: 1,
      width: "100%",
      maxWidth: 1200,
      marginHorizontal: "auto" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    padded: {
      flex: 1,
      width: "100%",
      maxWidth: 1200,
      marginHorizontal: "auto" as const,
      padding: "$4",
    },
  };

  return (
    <YStack
      backgroundColor="$background"
      {...variantStyles[variant]}
      {...props}
    />
  );
}
