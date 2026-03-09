// @ts-nocheck - Tamagui type recursion workaround
import {
  useSession,
  client,
  useQuery,
  useMutation,
  useQueryClient,
} from "@repo/api-client";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Button,
  Spinner,
  Select,
  ExclusiveMultiSelect,
  type SelectOption,
  type SelectionItem,
  getPlayerDisplayLabel,
} from "@repo/ui";
import { ChevronLeft, Minus, Plus, Check } from "@tamagui/lucide-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Pressable } from "react-native";
import { useTheme } from "tamagui";

interface Match {
  id: string;
  date: string;
  time: string;
  status: string;
  location?: {
    name: string;
  };
  court?: {
    name: string;
  };
}

interface VotingCriteria {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

interface UserVotes {
  hasVoted: boolean;
  votes: Array<{
    criteriaId: string;
    votedForUserId: string;
  }>;
}

export default function StatsVotingScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { matchId: preselectedMatchId } = useLocalSearchParams<{
    matchId?: string;
  }>();
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    preselectedMatchId || "",
  );
  const [beersCount, setBeersCount] = useState(0);
  const [attendedThirdTime, setAttendedThirdTime] = useState<boolean | null>(
    null,
  );
  const [voteSelections, setVoteSelections] = useState<
    Record<string, string | undefined>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const userId = session?.user?.id;
  const language = i18n.language === "es" ? "es" : "en";

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Fetch past matches for voting
  const { data: matchesData, isLoading: isLoadingMatches } = useQuery({
    queryKey: ["matches", "past", "voting"],
    queryFn: async () => {
      const res = await client.api.matches.$get({
        query: {
          type: "past",
          limit: "20",
          offset: "0",
        },
      });
      return res.json();
    },
    enabled: !!userId,
  });

  // Fetch voting criteria
  const { data: criteriaData, isLoading: isLoadingCriteria } = useQuery({
    queryKey: ["voting-criteria", language],
    queryFn: async () => {
      const res = await client.api.voting.criteria.$get();
      return res.json() as Promise<{ criteria: VotingCriteria[] }>;
    },
    enabled: !!userId,
  });

  // Fetch match players when a match is selected
  const { data: matchPlayersData, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ["match-players", selectedMatchId],
    queryFn: async () => {
      const res = await client.api.matches[":matchId"].players.$get({
        param: { matchId: selectedMatchId },
      });
      return res.json();
    },
    enabled: !!selectedMatchId,
  });

  // Fetch user's existing votes for selected match
  const { data: userVotesData } = useQuery({
    queryKey: ["user-votes", selectedMatchId, userId],
    queryFn: async () => {
      const res = await client.api.voting.matches[":matchId"].$get({
        param: { matchId: selectedMatchId },
      });
      return res.json() as Promise<UserVotes>;
    },
    enabled: !!selectedMatchId && !!userId,
  });

  // Submit votes mutation
  const submitVotesMutation = useMutation({
    mutationFn: async (
      votes: Array<{ criteriaId: string; votedForUserId: string }>,
    ) => {
      const res = await client.api.voting.matches[":matchId"].$post({
        param: { matchId: selectedMatchId },
        json: { votes },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error((error as any).error || "Failed to submit votes");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-votes", selectedMatchId],
      });
      setSubmitSuccess(true);
      setSubmitError(null);
      setTimeout(() => setSubmitSuccess(false), 3000);
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
      setSubmitSuccess(false);
    },
  });

  // Clear votes mutation
  const clearVotesMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.voting.matches[":matchId"].$delete({
        param: { matchId: selectedMatchId },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error((error as any).error || "Failed to clear votes");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-votes", selectedMatchId],
      });
      setVoteSelections({});
    },
  });

  // Pre-populate selections when user votes are loaded
  useMemo(() => {
    if (userVotesData?.votes?.length) {
      const selections: Record<string, string> = {};
      userVotesData.votes.forEach((vote) => {
        selections[vote.criteriaId] = vote.votedForUserId;
      });
      setVoteSelections(selections);
    }
  }, [userVotesData]);

  // Format matches for dropdown
  const matchOptions: SelectOption[] = useMemo(() => {
    if (!matchesData?.matches) return [];
    return matchesData.matches
      .filter((m: Match) => m.status === "completed" || m.status === "played")
      .map((match: Match) => ({
        value: match.id,
        label: `${formatDate(match.date)} / ${match.time} / ${match.location?.name || t("shared.unknown")}${match.court?.name ? ` - ${match.court.name}` : ""}`,
      }));
  }, [matchesData]);

  // Format players for exclusive multi-select
  const playerOptions: SelectOption[] = useMemo(() => {
    if (!matchPlayersData?.players) return [];
    return matchPlayersData.players
      .filter((p: any) => !p.isCancelled && p.userId !== userId && !p.isGuest)
      .map((player: any) => ({
        value: player.userId,
        label: getPlayerDisplayLabel({
          name: player.name,
          username: player.username,
          displayUsername: player.displayUsername,
        }),
      }));
  }, [matchPlayersData, userId]);

  // Format criteria for exclusive multi-select
  const criteriaItems: SelectionItem[] = useMemo(() => {
    if (!criteriaData?.criteria) return [];
    return criteriaData.criteria.map((c) => ({
      id: c.id,
      label: c.name,
      description: c.description || undefined,
    }));
  }, [criteriaData]);

  const handleSelectionChange = (itemId: string, value: string | undefined) => {
    setVoteSelections((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleSubmitVotes = async () => {
    const votes = Object.entries(voteSelections)
      .filter(([, value]) => value !== undefined)
      .map(([criteriaId, votedForUserId]) => ({
        criteriaId,
        votedForUserId: votedForUserId!,
      }));

    if (votes.length === 0) {
      setSubmitError(t("voting.selectPlayer"));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitVotesMutation.mutateAsync(votes);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasVoted = userVotesData?.hasVoted || false;

  if (!session?.user) {
    return (
      <Container variant="padded">
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Text>{t("auth.signInDescription")}</Text>
        </YStack>
      </Container>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("voting.title"),
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <ChevronLeft size={28} color={theme.color?.val} />
            </Pressable>
          ),
        }}
      />
      <Container variant="padded">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <YStack gap="$4">
            {/* Match Selection */}
            <Card variant="elevated" padding="$4">
              <YStack gap="$3">
                <Text fontSize="$5" fontWeight="600">
                  {t("voting.selectMatch")}
                </Text>

                {isLoadingMatches ? (
                  <Spinner size="small" />
                ) : (
                  <Select
                    placeholder={t("voting.selectMatch")}
                    options={matchOptions}
                    value={selectedMatchId}
                    onValueChange={(value) => {
                      setSelectedMatchId(value);
                      setVoteSelections({});
                      setSubmitSuccess(false);
                      setSubmitError(null);
                    }}
                  />
                )}
              </YStack>
            </Card>

            {/* 3rd Time Stats - Hidden for now, can be expanded */}
            {!!selectedMatchId && (
              <Card variant="outlined" padding="$4">
                <YStack gap="$3">
                  <Text fontSize="$5" fontWeight="600">
                    {t("voting.thirdTimeSection")}
                  </Text>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text>{t("voting.didYouGo")}</Text>
                    <XStack gap="$2">
                      <Button
                        size="$3"
                        variant={
                          attendedThirdTime === true ? "primary" : "outline"
                        }
                        onPress={() => setAttendedThirdTime(true)}
                      >
                        {t("voting.yes")}
                      </Button>
                      <Button
                        size="$3"
                        variant={
                          attendedThirdTime === false ? "primary" : "outline"
                        }
                        onPress={() => setAttendedThirdTime(false)}
                      >
                        {t("voting.no")}
                      </Button>
                    </XStack>
                  </XStack>
                  {attendedThirdTime && (
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text>{t("voting.beersCount")}</Text>
                      <XStack alignItems="center" gap="$2">
                        <Button
                          size="$3"
                          circular
                          icon={Minus}
                          variant="outline"
                          disabled={beersCount <= 0}
                          onPress={() =>
                            setBeersCount(Math.max(0, beersCount - 1))
                          }
                        />
                        <Text
                          fontSize="$5"
                          fontWeight="600"
                          width={40}
                          textAlign="center"
                        >
                          {beersCount}
                        </Text>
                        <Button
                          size="$3"
                          circular
                          icon={Plus}
                          variant="outline"
                          onPress={() => setBeersCount(beersCount + 1)}
                        />
                      </XStack>
                    </XStack>
                  )}
                </YStack>
              </Card>
            )}

            {/* Match Awards / Voting */}
            {!!selectedMatchId && (
              <Card variant="elevated" padding="$4">
                <YStack gap="$4">
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$5" fontWeight="600">
                      {t("voting.matchAwards")}
                    </Text>
                    {hasVoted && (
                      <Button
                        size="$2"
                        variant="outline"
                        onPress={() => clearVotesMutation.mutate()}
                        disabled={clearVotesMutation.isPending}
                      >
                        {clearVotesMutation.isPending ? (
                          <Spinner size="small" />
                        ) : (
                          t("voting.clearVotes")
                        )}
                      </Button>
                    )}
                  </XStack>
                  {isLoadingCriteria || isLoadingPlayers ? (
                    <YStack alignItems="center" padding="$4">
                      <Spinner size="large" />
                    </YStack>
                  ) : playerOptions.length === 0 ? (
                    <Text color="$gray11" textAlign="center">
                      {t("playerStats.noPlayers")}
                    </Text>
                  ) : (
                    <ExclusiveMultiSelect
                      items={criteriaItems}
                      options={playerOptions}
                      selections={voteSelections}
                      onSelectionChange={handleSelectionChange}
                      placeholder={t("voting.selectPlayer")}
                    />
                  )}

                  {submitError && (
                    <Text color="$red10" fontSize="$3" textAlign="center">
                      {submitError}
                    </Text>
                  )}

                  {submitSuccess && (
                    <XStack
                      backgroundColor="$green3"
                      padding="$3"
                      borderRadius="$3"
                      alignItems="center"
                      justifyContent="center"
                      gap="$2"
                    >
                      <Check size={16} color="$green10" />
                      <Text color="$green10" fontWeight="600">
                        {t("voting.votesSubmitted")}
                      </Text>
                    </XStack>
                  )}

                  <Button
                    variant="primary"
                    onPress={handleSubmitVotes}
                    disabled={
                      isSubmitting ||
                      Object.keys(voteSelections).filter(
                        (k) => voteSelections[k],
                      ).length === 0
                    }
                  >
                    {isSubmitting ? (
                      <XStack alignItems="center" gap="$2">
                        <Spinner size="small" color="white" />
                        <Text color="white">{t("voting.submitting")}</Text>
                      </XStack>
                    ) : (
                      t("voting.submitVotes")
                    )}
                  </Button>
                </YStack>
              </Card>
            )}

            {!selectedMatchId && (
              <Card variant="outlined" padding="$6">
                <YStack alignItems="center" gap="$2">
                  <Text color="$gray11" textAlign="center">
                    {t("voting.selectMatch")}
                  </Text>
                </YStack>
              </Card>
            )}
          </YStack>
        </ScrollView>
      </Container>
    </>
  );
}
