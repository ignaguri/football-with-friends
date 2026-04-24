import type { ComponentType } from "react";

export interface RosterAction {
  icon: ComponentType<{ size?: number }>;
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger" | "danger-outline" | "ghost";
  testID?: string;
  disabled?: boolean;
}
