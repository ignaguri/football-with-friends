import { YStack, Text } from "tamagui";
import { View } from "react-native";
import { StatusBadge, type PlayerStatusType } from "./StatusBadge";
import { getCountryFlag } from "../utils/country-flags";
import { getPlayerDisplayParts } from "../utils/display-name";
import {
  RosterRow,
  RosterRowActions,
  RosterSection,
  RosterSeparator,
  renderWithSeparators,
  type RosterAction,
} from "./roster";

// Existing callers use `PlayerAction`; keep it as an alias for the shared
// type so imports don't break.
export type PlayerAction = RosterAction;

export interface PlayerRow {
  id: string;
  name: string;
  status: PlayerStatusType;
  nationality?: string; // ISO 3166-1 alpha-2 country code
  isGuest?: boolean;
  addedByName?: string;
  isCurrentUser?: boolean;
  actions?: PlayerAction[];
  username?: string | null;
  displayUsername?: string | null;
  testID?: string;
}

export interface PlayersTableProps {
  players: PlayerRow[];
  isAdmin?: boolean;
  emptyMessage?: string;
  statusLabels?: Record<PlayerStatusType, string>;
  guestLabel?: string;
  cancelledLabel?: string;
}

export function PlayersTable({
  players,
  isAdmin = false,
  emptyMessage = "No players signed up yet",
  statusLabels,
  guestLabel = "Guest",
  cancelledLabel = "Cancelled",
}: PlayersTableProps) {
  if (players.length === 0) {
    return (
      <Text color="$gray11" textAlign="center" padding="$4">
        {emptyMessage}
      </Text>
    );
  }

  const canShowActions = (player: PlayerRow) => isAdmin || !!player.isCurrentUser;

  const getStatusLabel = (status: PlayerStatusType) => statusLabels?.[status] ?? status;

  const paidPlayers = players.filter((p) => p.status === "PAID");
  const pendingPlayers = players.filter((p) => p.status === "PENDING");
  const cancelledPlayers = players.filter((p) => p.status === "CANCELLED");

  const renderPrimary = (player: PlayerRow) => {
    if (player.isGuest) {
      return (
        <Text fontWeight={player.isCurrentUser ? "600" : "500"}>
          {player.addedByName ? `${player.name} (${player.addedByName})` : player.name}
        </Text>
      );
    }
    const { primary, secondary } = getPlayerDisplayParts(player);
    return (
      <YStack>
        <Text fontWeight={player.isCurrentUser ? "600" : "500"}>{primary}</Text>
        {secondary && (
          <Text fontSize="$2" color="$gray10" fontWeight="400">
            ({secondary})
          </Text>
        )}
      </YStack>
    );
  };

  const renderPlayerRow = (player: PlayerRow) => {
    const actions =
      canShowActions(player) && player.actions && player.actions.length > 0
        ? player.actions
        : undefined;

    const trailing = (
      <>
        <StatusBadge status={player.status} type="player" label={getStatusLabel(player.status)} />
        {actions ? (
          <>
            <View style={{ height: 4 }} />
            <RosterRowActions actions={actions} />
          </>
        ) : null}
      </>
    );

    return (
      <RosterRow
        key={player.id}
        testID={player.testID}
        leading={
          player.nationality ? (
            <Text fontSize="$5">{getCountryFlag(player.nationality)}</Text>
          ) : undefined
        }
        primary={renderPrimary(player)}
        secondary={
          player.isGuest ? (
            <Text fontSize="$2" color="$gray10">
              {guestLabel}
            </Text>
          ) : undefined
        }
        trailing={trailing}
        highlighted={player.isCurrentUser}
        dimmed={player.status === "CANCELLED"}
      />
    );
  };

  const renderSectionBody = (list: PlayerRow[]) => renderWithSeparators(list, renderPlayerRow);

  return (
    <YStack>
      {/* Paid players first */}
      {renderSectionBody(paidPlayers)}

      {/* Pending players second — with a separator if both lists are non-empty */}
      {pendingPlayers.length > 0 && paidPlayers.length > 0 && <RosterSeparator />}
      {renderSectionBody(pendingPlayers)}

      {/* Cancelled players last, under a visible header once there's anything above */}
      {cancelledPlayers.length > 0 && (
        <RosterSection
          label={paidPlayers.length > 0 || pendingPlayers.length > 0 ? cancelledLabel : undefined}
        >
          {renderSectionBody(cancelledPlayers)}
        </RosterSection>
      )}
    </YStack>
  );
}
