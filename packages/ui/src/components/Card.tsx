import { Card as TamaguiCard, CardProps } from "tamagui";

export interface CustomCardProps extends CardProps {
  variant?: "default" | "outlined" | "elevated";
}

export function Card({ variant = "default", ...props }: CustomCardProps) {
  const variantStyles = {
    default: {
      backgroundColor: "$background",
      padding: "$4",
      borderRadius: "$4",
    },
    outlined: {
      backgroundColor: "$background",
      padding: "$4",
      borderRadius: "$4",
      borderWidth: 1,
      borderColor: "$gray7",
    },
    elevated: {
      backgroundColor: "$background",
      padding: "$4",
      borderRadius: "$4",
      shadowColor: "$shadowColor",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
  };

  return <TamaguiCard {...variantStyles[variant]} {...props} />;
}
