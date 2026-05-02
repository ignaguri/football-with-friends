import type { ButtonProps } from "tamagui";
import { Button as TamaguiButton } from "tamagui";

export interface CustomButtonProps extends Omit<ButtonProps, "variant"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-outline" | "navy";
}

export function Button({ variant = "primary", ...props }: CustomButtonProps) {
  // Use theme-aware colors that adapt to light/dark mode
  const variantStyles = {
    primary: {
      backgroundColor: "$blue10",
      color: "white",
      hoverStyle: { backgroundColor: "$blue11" },
      pressStyle: { backgroundColor: "$blue11" },
    },
    secondary: {
      backgroundColor: "$gray4",
      color: "$color",
      hoverStyle: { backgroundColor: "$gray5" },
      pressStyle: { backgroundColor: "$gray6" },
    },
    outline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "$borderColor",
      color: "$color",
      alignSelf: "stretch" as const,
      hoverStyle: { backgroundColor: "$backgroundHover" },
      pressStyle: { backgroundColor: "$backgroundPress" },
    },
    ghost: {
      backgroundColor: "transparent",
      color: "$color",
      hoverStyle: { backgroundColor: "$backgroundHover" },
      pressStyle: { backgroundColor: "$backgroundPress" },
    },
    danger: {
      backgroundColor: "$red10",
      color: "white",
      hoverStyle: { backgroundColor: "$red11" },
      pressStyle: { backgroundColor: "$red11" },
    },
    "danger-outline": {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "$red8",
      color: "$red10",
      alignSelf: "stretch" as const,
      hoverStyle: { backgroundColor: "$red2" },
      pressStyle: { backgroundColor: "$red3" },
    },
    navy: {
      backgroundColor: "$brandNavy",
      color: "white",
      hoverStyle: { backgroundColor: "$brandNavyHover" },
      pressStyle: { backgroundColor: "$brandNavyHover" },
    },
  };

  return <TamaguiButton {...variantStyles[variant]} {...props} />;
}
