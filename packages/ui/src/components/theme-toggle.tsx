import { Button as TamaguiButton, styled } from "tamagui";
import { Sun, Moon } from "@tamagui/lucide-icons";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
  size?: "$2" | "$3" | "$4";
}

const IconButton = styled(TamaguiButton, {
  circular: true,
  backgroundColor: "$background",
  borderWidth: 1,
  borderColor: "$borderColor",

  variants: {
    size: {
      "$2": {
        width: 32,
        height: 32,
      },
      "$3": {
        width: 40,
        height: 40,
      },
      "$4": {
        width: 48,
        height: 48,
      },
    },
  } as const,

  defaultVariants: {
    size: "$3",
  },
});

export function ThemeToggle({ theme, onToggle, size = "$3" }: ThemeToggleProps) {
  const Icon = theme === "dark" ? Sun : Moon;
  const iconSize = size === "$2" ? 16 : size === "$3" ? 20 : 24;

  return (
    <IconButton
      size={size}
      onPress={onToggle}
      icon={<Icon size={iconSize} color="$color" />}
      pressStyle={{ opacity: 0.7 }}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    />
  );
}

export type { ThemeToggleProps };
