import { YStack, YStackProps } from "tamagui";

export interface ContainerProps extends YStackProps {
  variant?: "default" | "centered" | "padded";
}

export function Container({ variant = "default", ...props }: ContainerProps) {
  const variantStyles = {
    default: {
      flex: 1,
      width: "100%",
      maxWidth: 1200,
      marginHorizontal: "auto",
    },
    centered: {
      flex: 1,
      width: "100%",
      maxWidth: 1200,
      marginHorizontal: "auto",
      justifyContent: "center",
      alignItems: "center",
    },
    padded: {
      flex: 1,
      width: "100%",
      maxWidth: 1200,
      marginHorizontal: "auto",
      padding: "$4",
    },
  };

  return <YStack {...variantStyles[variant]} {...props} />;
}
