import { Button as TamaguiButton, ButtonProps } from "tamagui";

export interface CustomButtonProps extends Omit<ButtonProps, "variant"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-outline";
}

export function Button({ variant = "primary", ...props }: CustomButtonProps) {
  // Use theme-aware colors that adapt to light/dark mode
  const variantStyles = {
    primary: {
      backgroundColor: "$blue10",
      color: "#FFFFFF",
      hoverStyle: { backgroundColor: "$blue11" },
      pressStyle: { backgroundColor: "$blue11" },
    },
    secondary: {
      backgroundColor: "$backgroundStrong",
      color: "$color",
      hoverStyle: { backgroundColor: "$backgroundHover" },
      pressStyle: { backgroundColor: "$backgroundPress" },
    },
    outline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "$borderColor",
      color: "$color",
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
      color: "#FFFFFF",
      hoverStyle: { backgroundColor: "$red11" },
      pressStyle: { backgroundColor: "$red11" },
    },
    "danger-outline": {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "$red8",
      color: "$red10",
      hoverStyle: { backgroundColor: "$red2" },
      pressStyle: { backgroundColor: "$red3" },
    },
  };

  return <TamaguiButton {...variantStyles[variant]} {...props} />;
}
