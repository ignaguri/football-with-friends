// @ts-nocheck - Tamagui type recursion workaround
import { useState } from "react";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Spinner,
  Button,
  StatsSummary,
  UserAvatar,
  H2,
} from "@repo/ui";
import {
  useQuery,
  useMutation,
  useQueryClient,
  client,
  useSession,
} from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView } from "react-native";

interface FinishedMatchForUser {
  matchId: string;
  date: string;
  time: string;
  locationName: string;
  courtName?: string;
  wasSignedUp: boolean;
  existingStats: {
    goals: number;
    thirdTimeAttended: boolean;
    thirdTimeBeers: number;
  } | null;
}

interface PlayerProfile {
  user: {
    id: string;
    name: string;
    email: string;
    nationality?: string;
  };
  totalMatchesPlayed: number;
  totalGoals: number;
  totalThirdTimeAttendances: number;
  totalBeers: number;
}

export default function MyInfoScreen() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  // Local edit state: matchId -> { goals, thirdTimeAttended, thirdTimeBeers }
  const [editState, setEditState] = useState<
    Record<
      string,
      { goals?: number; thirdTimeAttended?: boolean; thirdTimeBeers?: number }
    >
  >({});

  const {
    data: profile,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ["player-profile", userId],
    queryFn: async () => {
      const res = await client.api.players[":userId"].$get({
        param: { userId: userId! },
      });
      return res.json() as Promise<PlayerProfile>;
    },
    enabled: !!userId,
  });

  const {
    data: finishedMatches,
    isLoading: matchesLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["my-finished-matches"],
    queryFn: async () => {
      const res = await client.api.players.me["finished-matches"].$get();
      return res.json() as Promise<FinishedMatchForUser[]>;
    },
    enabled: !!userId,
  });

  const recordStatsMutation = useMutation({
    mutationFn: async ({
      matchId,
      data,
    }: {
      matchId: string;
      data: {
        userId: string;
        goals?: number;
        thirdTimeAttended?: boolean;
        thirdTimeBeers?: number;
      };
    }) => {
      const res = await client.api.matches[":id"]["player-stats"].$post({
        param: { id: matchId },
        json: data,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["my-finished-matches"] });
    },
  });

  const updateStatsMutation = useMutation({
    mutationFn: async ({
      matchId,
      targetUserId,
      data,
    }: {
      matchId: string;
      targetUserId: string;
      data: {
        goals?: number;
        thirdTimeAttended?: boolean;
        thirdTimeBeers?: number;
      };
    }) => {
      const res = await client.api.matches[":id"]["player-stats"][
        ":userId"
      ].$patch({
        param: { id: matchId, userId: targetUserId },
        json: data,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["my-finished-matches"] });
    },
  });

  const getEditState = (match: FinishedMatchForUser) => {
    const local = editState[match.matchId];
    return {
      goals: local?.goals ?? match.existingStats?.goals ?? 0,
      thirdTimeAttended:
        local?.thirdTimeAttended ??
        match.existingStats?.thirdTimeAttended ??
        false,
      thirdTimeBeers:
        local?.thirdTimeBeers ?? match.existingStats?.thirdTimeBeers ?? 0,
    };
  };

  const updateLocalState = (
    matchId: string,
    field: string,
    value: number | boolean,
  ) => {
    setEditState((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value },
    }));
  };

  const handleSave = (match: FinishedMatchForUser) => {
    const state = getEditState(match);
    const data = {
      goals: match.wasSignedUp ? state.goals : undefined,
      thirdTimeAttended: state.thirdTimeAttended,
      thirdTimeBeers: state.thirdTimeBeers,
    };

    if (match.existingStats) {
      updateStatsMutation.mutate({
        matchId: match.matchId,
        targetUserId: userId!,
        data,
      });
    } else {
      recordStatsMutation.mutate({
        matchId: match.matchId,
        data: { userId: userId!, ...data },
      });
    }

    // Clear local edit state for this match
    setEditState((prev) => {
      const next = { ...prev };
      delete next[match.matchId];
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isLoading = profileLoading || matchesLoading;
  const isMutating =
    recordStatsMutation.isPending || updateStatsMutation.isPending;

  if (!userId) {
    return (
      <Container variant="padded">
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
        </YStack>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container variant="padded">
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
          <Text marginTop="$2" color="$gray11">
            {t("shared.loading")}
          </Text>
        </YStack>
      </Container>
    );
  }

  return (
    <Container variant="padded">
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <YStack gap="$4" paddingBottom="$6">
          {/* Profile Summary */}
          {profile && (
            <Card variant="elevated">
              <YStack padding="$4" gap="$3">
                <XStack gap="$3" alignItems="center">
                  <UserAvatar
                    name={profile.user.name}
                    countryCode={profile.user.nationality}
                    size={48}
                  />
                  <YStack flex={1}>
                    <Text fontSize="$6" fontWeight="700">
                      {profile.user.name}
                    </Text>
                    <Text fontSize="$3" color="$gray10">
                      {profile.user.email}
                    </Text>
                  </YStack>
                </XStack>
                <StatsSummary
                  stats={[
                    {
                      label: t("playerStats.totalMatches"),
                      value: profile.totalMatchesPlayed,
                      color: "$blue10",
                    },
                    {
                      label: t("playerStats.totalGoals"),
                      value: profile.totalGoals,
                      color: "$green10",
                    },
                    {
                      label: t("playerStats.totalThirdTimes"),
                      value: profile.totalThirdTimeAttendances,
                      color: "$orange10",
                    },
                    {
                      label: t("playerStats.totalBeers"),
                      value: profile.totalBeers,
                      color: "$yellow10",
                    },
                  ]}
                />
              </YStack>
            </Card>
          )}

          {/* Finished Matches */}
          <YStack gap="$3">
            <H2 fontSize="$5" fontWeight="600">
              {t("playerStats.finishedMatches")}
            </H2>
            <Text fontSize="$2" color="$gray10">
              {t("playerStats.goalsOnlyPlayed")}
            </Text>

            {(!finishedMatches || finishedMatches.length === 0) && (
              <Card variant="outlined">
                <YStack padding="$4" alignItems="center">
                  <Text fontSize="$4" color="$gray11">
                    {t("playerStats.noFinishedMatches")}
                  </Text>
                </YStack>
              </Card>
            )}

            {finishedMatches?.map((match) => {
              const state = getEditState(match);
              const hasLocalEdits = !!editState[match.matchId];

              return (
                <Card key={match.matchId} variant="outlined">
                  <YStack padding="$3" gap="$3">
                    {/* Match Header */}
                    <XStack justifyContent="space-between" alignItems="center">
                      <YStack flex={1}>
                        <Text fontSize="$4" fontWeight="600">
                          {formatDate(match.date)}
                        </Text>
                        <Text fontSize="$2" color="$gray10">
                          {match.locationName}
                          {match.courtName ? ` - ${match.courtName}` : ""}
                        </Text>
                      </YStack>
                      <YStack
                        paddingHorizontal="$2"
                        paddingVertical="$1"
                        borderRadius={6}
                        backgroundColor={
                          match.wasSignedUp ? "$green3" : "$gray4"
                        }
                      >
                        <Text
                          fontSize="$1"
                          fontWeight="600"
                          color={match.wasSignedUp ? "$green11" : "$gray11"}
                        >
                          {match.wasSignedUp
                            ? t("playerStats.played")
                            : t("playerStats.didNotPlay")}
                        </Text>
                      </YStack>
                    </XStack>

                    {/* Goals Section - only if user played */}
                    {match.wasSignedUp && (
                      <XStack
                        alignItems="center"
                        gap="$3"
                        paddingTop="$2"
                        borderTopWidth={1}
                        borderTopColor="$gray4"
                      >
                        <Text fontSize="$3" fontWeight="500" width={50}>
                          {t("playerStats.goals")}
                        </Text>
                        <XStack alignItems="center" gap="$2" flex={1}>
                          <Button
                            size="$2"
                            variant="outline"
                            disabled={state.goals <= 0}
                            onPress={() =>
                              updateLocalState(
                                match.matchId,
                                "goals",
                                Math.max(0, state.goals - 1),
                              )
                            }
                          >
                            -
                          </Button>
                          <Text
                            fontSize="$5"
                            fontWeight="700"
                            textAlign="center"
                            minWidth={30}
                          >
                            {state.goals}
                          </Text>
                          <Button
                            size="$2"
                            variant="outline"
                            onPress={() =>
                              updateLocalState(
                                match.matchId,
                                "goals",
                                state.goals + 1,
                              )
                            }
                          >
                            +
                          </Button>
                        </XStack>
                      </XStack>
                    )}

                    {/* 3rd Half Section - always available */}
                    <XStack
                      alignItems="center"
                      gap="$3"
                      paddingTop="$2"
                      borderTopWidth={match.wasSignedUp ? 0 : 1}
                      borderTopColor="$gray4"
                    >
                      <Text fontSize="$3" fontWeight="500" width={50}>
                        {t("playerStats.thirdTime")}
                      </Text>
                      <XStack alignItems="center" gap="$2" flex={1}>
                        <Button
                          size="$2"
                          variant={
                            state.thirdTimeAttended ? "primary" : "outline"
                          }
                          onPress={() =>
                            updateLocalState(
                              match.matchId,
                              "thirdTimeAttended",
                              !state.thirdTimeAttended,
                            )
                          }
                        >
                          {state.thirdTimeAttended
                            ? t("playerStats.attended")
                            : t("playerStats.notAttended")}
                        </Button>
                        {state.thirdTimeAttended && (
                          <XStack alignItems="center" gap="$2">
                            <Text fontSize="$2" color="$gray10">
                              {t("playerStats.beers")}:
                            </Text>
                            <Button
                              size="$2"
                              variant="outline"
                              disabled={state.thirdTimeBeers <= 0}
                              onPress={() =>
                                updateLocalState(
                                  match.matchId,
                                  "thirdTimeBeers",
                                  Math.max(0, state.thirdTimeBeers - 1),
                                )
                              }
                            >
                              -
                            </Button>
                            <Text
                              fontSize="$4"
                              fontWeight="700"
                              textAlign="center"
                              minWidth={20}
                            >
                              {state.thirdTimeBeers}
                            </Text>
                            <Button
                              size="$2"
                              variant="outline"
                              onPress={() =>
                                updateLocalState(
                                  match.matchId,
                                  "thirdTimeBeers",
                                  state.thirdTimeBeers + 1,
                                )
                              }
                            >
                              +
                            </Button>
                          </XStack>
                        )}
                      </XStack>
                    </XStack>

                    {/* Save Button */}
                    {hasLocalEdits && (
                      <Button
                        variant="primary"
                        size="$3"
                        onPress={() => handleSave(match)}
                        disabled={isMutating}
                      >
                        {isMutating ? (
                          <Spinner size="small" />
                        ) : (
                          t("playerStats.confirm")
                        )}
                      </Button>
                    )}
                  </YStack>
                </Card>
              );
            })}
          </YStack>
        </YStack>
      </ScrollView>
    </Container>
  );
}
