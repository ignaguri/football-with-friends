import { ComponentType, Fragment } from "react";
import { XStack, YStack, Text } from "tamagui";
import { View, StyleSheet } from "react-native";
import { StatusBadge, type PlayerStatusType } from "./StatusBadge";
import { Button } from "./Button";
import { getCountryFlag } from "../utils/country-flags";
import { getPlayerDisplayParts } from "../utils/display-name";

export interface PlayerAction {
  icon: ComponentType<{ size?: number }>;
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger" | "danger-outline" | "ghost";
}

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
}

export interface PlayersTableProps {
  players: PlayerRow[];
  isAdmin?: boolean;
  emptyMessage?: string;
  statusLabels?: Record<PlayerStatusType, string>;
}

export function PlayersTable({
  players,
  isAdmin = false,
  emptyMessage = "No players signed up yet",
  statusLabels,
}: PlayersTableProps) {
  if (players.length === 0) {
    return (
      <Text color="$gray11" textAlign="center" padding="$4">
        {emptyMessage}
      </Text>
    );
  }

  const canShowActions = (player: PlayerRow) => {
    return isAdmin || player.isCurrentUser;
  };

  const getStatusLabel = (status: PlayerStatusType) => {
    if (statusLabels && statusLabels[status]) {
      return statusLabels[status];
    }
    return status;
  };

  // Group players by status for better organization
  const paidPlayers = players.filter((p) => p.status === "PAID");
  const pendingPlayers = players.filter((p) => p.status === "PENDING");
  const cancelledPlayers = players.filter((p) => p.status === "CANCELLED");

  const renderPlayerRow = (player: PlayerRow) => {
    const { primary, secondary } = getPlayerDisplayParts(player);
    return (
    <XStack
      key={player.id}
      justifyContent="space-between"
      alignItems="center"
      paddingVertical="$2"
      paddingHorizontal="$3"
      opacity={player.status === "CANCELLED" ? 0.6 : 1}
      backgroundColor={player.isCurrentUser ? "$blue2" : "transparent"}
      borderRadius={player.isCurrentUser ? "$2" : 0}
    >
      <YStack flex={1} gap="$1">
        <XStack gap="$2" alignItems="center">
          {player.nationality && (
            <Text fontSize="$5">{getCountryFlag(player.nationality)}</Text>
          )}
          {player.isGuest ? (
            <Text fontWeight={player.isCurrentUser ? "600" : "500"}>
              {player.addedByName ? `${player.name} (${player.addedByName})` : player.name}
            </Text>
          ) : (
            <YStack>
              <Text fontWeight={player.isCurrentUser ? "600" : "500"}>{primary}</Text>
              {secondary && (
                <Text fontSize="$2" color="$gray10" fontWeight="400">({secondary})</Text>
              )}
            </YStack>
          )}
        </XStack>
        {player.isGuest && (
          <Text fontSize="$2" color="$gray10">
            Guest
          </Text>
        )}
      </YStack>

      <View style={{ alignItems: 'flex-end' }}>
        <StatusBadge
          status={player.status}
          type="player"
          label={getStatusLabel(player.status)}
        />

        {canShowActions(player) && player.actions && player.actions.length > 0 && (
          <>
            <View style={{ height: 4 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {player.actions.map((action, idx) => {
                const IconComponent = action.icon;
                return (
                  <Button
                    key={idx}
                    variant={action.variant || "ghost"}
                    size="$2"
                    circular
                    width={28}
                    height={28}
                    onPress={action.onPress}
                    aria-label={action.label}
                  >
                    <IconComponent size={16} />
                  </Button>
                );
              })}
            </View>
          </>
        )}
      </View>
    </XStack>
  );
  };

  const RowSeparator = () => (
    <View style={separatorStyle.line} />
  );

  const renderWithSeparators = (list: PlayerRow[]) =>
    list.map((player, i) => (
      <Fragment key={player.id}>
        {i > 0 && <RowSeparator />}
        {renderPlayerRow(player)}
      </Fragment>
    ));

  return (
    <YStack>
      {/* Paid players first */}
      {renderWithSeparators(paidPlayers)}

      {/* Pending players second */}
      {pendingPlayers.length > 0 && paidPlayers.length > 0 && <RowSeparator />}
      {renderWithSeparators(pendingPlayers)}

      {/* Cancelled players last (with visual separation) */}
      {cancelledPlayers.length > 0 && (
        <>
          {(paidPlayers.length > 0 || pendingPlayers.length > 0) && (
            <XStack
              paddingVertical="$2"
              paddingHorizontal="$3"
              backgroundColor="$gray2"
              marginTop="$2"
            >
              <Text fontSize="$2" color="$gray10" fontWeight="500">
                Cancelled
              </Text>
            </XStack>
          )}
          {renderWithSeparators(cancelledPlayers)}
        </>
      )}
    </YStack>
  );
}

const separatorStyle = StyleSheet.create({
  line: {
    borderBottomWidth: 1,
    borderBottomColor: '#a1a1aa',
    marginHorizontal: 12,
    marginVertical: 6,
  },
});
