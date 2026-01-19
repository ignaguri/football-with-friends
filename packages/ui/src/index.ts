// Form Components
export { Button } from "./components/Button";
export type { CustomButtonProps } from "./components/Button";

export { Input } from "./components/Input";
export type { CustomInputProps } from "./components/Input";

export { Select } from "./components/Select";
export type { CustomSelectProps, SelectOption } from "./components/Select";

// Layout Components
export { Card } from "./components/Card";
export type { CustomCardProps } from "./components/Card";

export { Container } from "./components/Container";
export type { ContainerProps } from "./components/Container";

// Feedback Components
export { Dialog } from "./components/Dialog";
export type { CustomDialogProps } from "./components/Dialog";

export { AlertDialog } from "./components/AlertDialog";
export type { AlertDialogProps } from "./components/AlertDialog";

export { Toast, ToastViewport } from "./components/Toast";
export type { ToastProps } from "./components/Toast";

export { Spinner } from "./components/Spinner";
export type { CustomSpinnerProps } from "./components/Spinner";

export { Badge } from "./components/Badge";
export type { BadgeProps } from "./components/Badge";

export { UserAvatar } from "./components/user-avatar";
export type { UserAvatarProps } from "./components/user-avatar";

export { ThemeToggle } from "./components/theme-toggle";
export type { ThemeToggleProps } from "./components/theme-toggle";

export { LanguageSwitcher } from "./components/language-switcher";
export type { LanguageSwitcherProps, Language } from "./components/language-switcher";

export { DatePicker } from "./components/DatePicker";
export type { DatePickerProps } from "./components/DatePicker";

export { TimePicker } from "./components/TimePicker";
export type { TimePickerProps } from "./components/TimePicker";

// Navigation Components
export { Tabs } from "./components/Tabs";
export type { TabsProps, TabItem } from "./components/Tabs";

// Status Components
export { StatusBadge } from "./components/StatusBadge";
export type {
  StatusBadgeProps,
  PlayerStatusType,
  MatchStatusType,
} from "./components/StatusBadge";

export { PlayersTable } from "./components/PlayersTable";
export type {
  PlayersTableProps,
  PlayerRow,
  PlayerAction,
} from "./components/PlayersTable";

export { List, ListItem } from "./components/List";
export type { ListProps, ListItemProps } from "./components/List";

// Re-export commonly used Tamagui components
export {
  Text,
  View,
  XStack,
  YStack,
  ScrollView,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Paragraph,
  Separator,
  Image,
} from "tamagui";

// Toast utilities
export { useToastController } from "@tamagui/toast";

// Utility functions
export {
  getCountryFlag,
  getCountryName,
  getCountry,
  isValidCountryCode,
  COUNTRIES,
} from "./utils/country-flags";
export type { Country } from "./utils/country-flags";
