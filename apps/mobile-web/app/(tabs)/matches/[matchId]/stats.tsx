// @ts-nocheck - Tamagui type recursion workaround
import {
  client,
  useQuery,
  useMutation,
  useQueryClient,
  useSession,
  useCurrentGroup,
} from "@repo/api-client";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Button,
  Spinner,
  AwardCard,
  useToastController,
} from "@repo/ui";
import { Beer, CheckCircle2, Lock, Unlock } from "@tamagui/lucide-icons-2";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Alert, RefreshControl, ScrollView } from "react-native";

import type { MatchStats } from "@repo/shared/domain";

import { formatLocalizedDate } from "@/lib/date-utils";

export default function MatchStatsScreen() {
  const { t } = useTranslation();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { data: session } = useSession();
  const { myRole } = useCurrentGroup();
  const queryClient = useQueryClient();
  const toast = useToastController();

  const isOrganizer = myRole === "organizer" || session?.user?.role === "admin";

  const {
    data: stats,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<MatchStats>({
    queryKey: ["match-stats", matchId],
    queryFn: async () => {
      const res = await client.api.voting.matches[":matchId"].stats.$get({
        param: { matchId },
      });
      return res.json();
    },
    enabled: !!matchId,
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.voting.matches[":matchId"][
        "close-voting"
      ].$post({
        param: { matchId },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || t("matchStats.closeVoting.failed"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-stats", matchId] });
      toast.show(t("matchStats.closeVoting.success"));
    },
    onError: (e: any) => {
      toast.show(e?.message || t("matchStats.closeVoting.failed"));
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.voting.matches[":matchId"][
        "reopen-voting"
      ].$post({
        param: { matchId },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || t("matchStats.reopenVoting.failed"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-stats", matchId] });
      toast.show(t("matchStats.reopenVoting.success"));
    },
  });

  const awardsByCriteria = useMemo(() => {
    if (!stats?.results) return [];
    const map = new Map<
      string,
      {
        criteriaId: string;
        criteriaCode: string;
        criteriaName: string;
        topPlayers: Array<{ userName: string; voteCount: number }>;
      }
    >();
    for (const r of stats.results) {
      let entry = map.get(r.criteriaId);
      if (!entry) {
        entry = {
          criteriaId: r.criteriaId,
          criteriaCode: r.criteriaCode,
          criteriaName: r.criteriaName,
          topPlayers: [],
        };
        map.set(r.criteriaId, entry);
      }
      entry.topPlayers.push({
        userName: r.votedForUserName,
        voteCount: r.voteCount,
      });
    }
    return Array.from(map.values());
  }, [stats]);

  const confirmClose = () => {
    Alert.alert(
      t("matchStats.closeVoting.action"),
      t("matchStats.closeVoting.confirm"),
      [
        {
          text: t("shared.cancel", { defaultValue: "Cancel" }),
          style: "cancel",
        },
        {
          text: t("matchStats.closeVoting.action"),
          style: "destructive",
          onPress: () => closeMutation.mutate(),
        },
      ],
    );
  };

  const confirmReopen = () => {
    Alert.alert(
      t("matchStats.reopenVoting.action"),
      t("matchStats.reopenVoting.confirm"),
      [
        {
          text: t("shared.cancel", { defaultValue: "Cancel" }),
          style: "cancel",
        },
        {
          text: t("matchStats.reopenVoting.action"),
          onPress: () => reopenMutation.mutate(),
        },
      ],
    );
  };

  return (
    <Container variant="padded">
      <Stack.Screen options={{ title: t("matchStats.title") }} />

      {isLoading && (
        <YStack alignItems="center" padding="$6">
          <Spinner size="large" />
        </YStack>
      )}

      {error && (
        <Card variant="outlined" backgroundColor="$red2">
          <YStack padding="$3">
            <Text color="$red11">
              {t("shared.error", { defaultValue: "Something went wrong" })}
            </Text>
          </YStack>
        </Card>
      )}

      {stats && (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          <YStack gap="$3" paddingBottom="$6">
            {/* Status banner */}
            <Card variant="elevated">
              <YStack padding="$3" gap="$2">
                <XStack alignItems="center" gap="$2">
                  {stats.isVotingClosed ? (
                    <Lock size={18} color="$gray10" />
                  ) : (
                    <Unlock size={18} color="$blue10" />
                  )}
                  <Text fontSize="$5" fontWeight="700">
                    {stats.isVotingClosed
                      ? t("matchStats.votingClosed")
                      : t("matchStats.votingClosesIn", {
                          when: formatLocalizedDate(
                            stats.votingAutoCloseAt,
                            "MMM d, yyyy",
                          ),
                        })}
                  </Text>
                </XStack>
                {stats.isVotingClosed && (
                  <Text color="$gray11" fontSize="$3">
                    {t("matchStats.participation", {
                      voted: stats.totalVoters,
                      eligible: stats.eligibleVoterCount,
                    })}
                  </Text>
                )}
                {isOrganizer && !stats.isVotingClosed && (
                  <Button
                    variant="outline"
                    size="$3"
                    onPress={confirmClose}
                    disabled={closeMutation.isPending}
                    testID="match-stats-close-voting-btn"
                  >
                    {t("matchStats.closeVoting.action")}
                  </Button>
                )}
                {isOrganizer &&
                  stats.isVotingClosed &&
                  stats.votingClosedAt && (
                    <Button
                      variant="outline"
                      size="$3"
                      onPress={confirmReopen}
                      disabled={reopenMutation.isPending}
                      testID="match-stats-reopen-voting-btn"
                    >
                      {t("matchStats.reopenVoting.action")}
                    </Button>
                  )}
              </YStack>
            </Card>

            {/* Awards (only when closed) */}
            {stats.isVotingClosed && (
              <YStack gap="$3">
                <Text fontSize="$6" fontWeight="700" paddingHorizontal="$1">
                  {t("matchStats.awards.title")}
                </Text>
                {awardsByCriteria.length === 0 ? (
                  <Card variant="outlined">
                    <YStack padding="$4" alignItems="center">
                      <Text color="$gray11">{t("matchStats.empty")}</Text>
                    </YStack>
                  </Card>
                ) : (
                  awardsByCriteria.map((award) => (
                    <AwardCard
                      key={award.criteriaId}
                      criteriaName={t(`voting.criteria.${award.criteriaCode}`, {
                        defaultValue: award.criteriaName,
                      })}
                      criteriaCode={award.criteriaCode}
                      criteriaDescription={t(
                        `voting.criteria.${award.criteriaCode}_desc`,
                        { defaultValue: "" },
                      )}
                      topPlayers={award.topPlayers}
                      noVotesLabel={t("matchStats.empty")}
                      formatVotes={(count) =>
                        t("matchStats.awards.voteCount", { count })
                      }
                    />
                  ))
                )}
              </YStack>
            )}

            {/* Post-match social stats (only when closed) */}
            {stats.isVotingClosed && (
              <Card variant="elevated">
                <YStack padding="$3" gap="$2">
                  <Text fontSize="$6" fontWeight="700">
                    {t("matchStats.social.title")}
                  </Text>
                  {stats.playerStats.length > 0 ? (
                    stats.playerStats.map((p) => (
                      <XStack
                        key={p.userId}
                        alignItems="center"
                        justifyContent="space-between"
                        paddingVertical="$2"
                        borderBottomWidth={1}
                        borderBottomColor="$borderColor"
                      >
                        <Text flex={1} fontSize="$4">
                          {p.userName}
                        </Text>
                        <XStack alignItems="center" gap="$3">
                          {p.thirdTimeAttended && (
                            <XStack alignItems="center" gap="$1">
                              <CheckCircle2 size={16} color="$green10" />
                              <Text fontSize="$2" color="$gray11">
                                {t("matchStats.social.thirdTimeAttended")}
                              </Text>
                            </XStack>
                          )}
                          {p.thirdTimeBeers > 0 && (
                            <XStack alignItems="center" gap="$1">
                              <Beer size={16} color="$orange10" />
                              <Text fontSize="$3" fontWeight="600">
                                {p.thirdTimeBeers}
                              </Text>
                            </XStack>
                          )}
                        </XStack>
                      </XStack>
                    ))
                  ) : (
                    <Text
                      color="$gray11"
                      textAlign="center"
                      paddingVertical="$3"
                    >
                      {t("matchStats.social.noEntries")}
                    </Text>
                  )}
                </YStack>
              </Card>
            )}

            {/* Open-state hint */}
            {!stats.isVotingClosed && (
              <Card variant="outlined">
                <YStack padding="$4" alignItems="center" gap="$2">
                  <Lock size={28} color="$gray9" />
                  <Text color="$gray11" textAlign="center">
                    {t("matchStats.openHint")}
                  </Text>
                </YStack>
              </Card>
            )}
          </YStack>
        </ScrollView>
      )}
    </Container>
  );
}
