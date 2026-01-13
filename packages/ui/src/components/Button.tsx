import { Button as TamaguiButton, ButtonProps } from "tamagui";

export interface CustomButtonProps extends ButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
}

export function Button({ variant = "primary", ...props }: CustomButtonProps) {
  const variantStyles = {
    primary: {
      backgroundColor: "$blue10",
      color: "$white1",
      hoverStyle: { backgroundColor: "$blue11" },
      pressStyle: { backgroundColor: "$blue9" },
    },
    secondary: {
      backgroundColor: "$gray5",
      color: "$gray12",
      hoverStyle: { backgroundColor: "$gray6" },
      pressStyle: { backgroundColor: "$gray4" },
    },
    outline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "$gray7",
      color: "$gray12",
      hoverStyle: { backgroundColor: "$gray3" },
      pressStyle: { backgroundColor: "$gray2" },
    },
    ghost: {
      backgroundColor: "transparent",
      color: "$gray12",
      hoverStyle: { backgroundColor: "$gray3" },
      pressStyle: { backgroundColor: "$gray2" },
    },
    danger: {
      backgroundColor: "$red10",
      color: "$white1",
      hoverStyle: { backgroundColor: "$red11" },
      pressStyle: { backgroundColor: "$red9" },
    },
  };

  return <TamaguiButton {...variantStyles[variant]} {...props} />;
}
