// Form Components
export { Button } from "./components/Button";
export type { CustomButtonProps } from "./components/Button";

export { Input } from "./components/Input";
export type { CustomInputProps } from "./components/Input";

export { PhoneInput, parsePhoneNumber, isValidPhoneNumber } from "./components/phone-input";
export type { PhoneInputProps } from "./components/phone-input";

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
export type { StatusBadgeProps, PlayerStatusType, MatchStatusType } from "./components/StatusBadge";

export { PlayersTable } from "./components/PlayersTable";
export type { PlayersTableProps, PlayerRow, PlayerAction } from "./components/PlayersTable";

export { MembersTable } from "./components/MembersTable";
export type {
  MembersTableProps,
  MemberRow,
  MemberRole as MembersTableRole,
} from "./components/MembersTable";

// Roster primitives — shared between PlayersTable, MembersTable and
// future roster-style tables.
export {
  RosterRow,
  RosterRowActions,
  RosterSeparator,
  RosterSection,
  renderWithSeparators,
} from "./components/roster";
export type {
  RosterRowProps,
  RosterRowActionsProps,
  RosterSectionProps,
  RosterAction,
} from "./components/roster";

export { List, ListItem } from "./components/List";
export type { ListProps, ListItemProps } from "./components/List";

// Player Stats Components
export { StatsSummary } from "./components/StatsSummary";
export type { StatsSummaryProps, StatItem } from "./components/StatsSummary";

export { PlayerStatsCard } from "./components/PlayerStatsCard";
export type { PlayerStatsCardProps } from "./components/PlayerStatsCard";

export { StatsInputRow } from "./components/StatsInputRow";
export type { StatsInputRowProps } from "./components/StatsInputRow";

export { RankingCard } from "./components/RankingCard";
export type { RankingCardProps } from "./components/RankingCard";

export { PodiumDisplay } from "./components/PodiumDisplay";
export type { PodiumDisplayProps } from "./components/PodiumDisplay";

export { AwardCard } from "./components/AwardCard";
export type { AwardCardProps } from "./components/AwardCard";

export { VotingStatsSection } from "./components/VotingStatsSection";
export type { VotingStatsSectionProps } from "./components/VotingStatsSection";

export { ReactionBar } from "./components/ReactionBar";
export type { ReactionBarProps } from "./components/ReactionBar";

export { MediaGrid } from "./components/MediaGrid";
export type { MediaGridProps } from "./components/MediaGrid";

export { MediaLightbox } from "./components/MediaLightbox";
export type { MediaLightboxProps } from "./components/MediaLightbox";

export { ExclusiveMultiSelect } from "./components/exclusive-multi-select";
export type {
  ExclusiveMultiSelectProps,
  SelectionItem,
  ExclusiveSelection,
  VotingCriteriaItem,
} from "./components/exclusive-multi-select";

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
} from "tamagui";

// Use expo-image instead of Tamagui's — Tamagui v2's Image doesn't map
// `source` to `src` on web. expo-image supports SVG on iOS via SDWebImage,
// handles require() assets on all platforms, and renders via <img> on web.
export { Image } from "expo-image";

// Toast utilities
export { useToastController } from "@tamagui/toast";

// Utility functions
export {
  getCountryFlag,
  getCountryName,
  getCountry,
  isValidCountryCode,
  getCountryDialCode,
  getCountryFromDialCode,
  COUNTRIES,
  COUNTRIES_WITH_DIAL_CODES,
  DIAL_CODE_OPTIONS,
} from "./utils/country-flags";
export type { Country, CountryWithDialCode } from "./utils/country-flags";

// Display name utilities
export { getPlayerDisplayParts, getPlayerDisplayLabel } from "./utils/display-name";
