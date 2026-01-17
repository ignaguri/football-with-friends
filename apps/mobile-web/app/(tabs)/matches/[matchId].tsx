import { useState } from "react";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Spinner,
  Badge,
  Button,
  Dialog,
  Input,
} from "@repo/ui";
import { useQuery, useMutation, useQueryClient, client, useSession } from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, router } from "expo-router";
import { RefreshControl, ScrollView, Share, Linking, Alert } from "react-native";

type PlayerStatus = "PAID" | "PENDING" | "CANCELLED";

interface Signup {
  id: string;
  matchId: string;
  userId?: string;
  playerName: string;
  playerEmail: string;
  status: PlayerStatus;
  signupType: "self" | "guest";
  guestOwnerId?: string;
  addedByUserId: string;
}

interface MatchDetails {
  id: string;
  date: string;
  time: string;
  status: string;
  maxPlayers: number;
  costPerPlayer?: string;
  shirtCost?: string;
  location?: { id: string; name: string; address?: string };
  court?: { id: string; name: string };
  signups: Signup[];
  availableSpots: number;
  isUserSignedUp?: boolean;
  userSignup?: Signup;
}

export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [guestName, setGuestName] = useState("");

  const userId = session?.user?.id;
  const isAdmin = session?.user?.role === "admin";

  const {
    data: match,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const res = await client.api.matches[":id"].$get({
        param: { id: matchId! },
        query: { userId: userId || "" },
      });
      return res.json() as Promise<MatchDetails>;
    },
    enabled: !!matchId,
  });

  const signupMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.matches[":id"].signup.$post({
        param: { id: matchId! },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any).error || "Failed to sign up");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      Alert.alert(t("matchDetail.signupSuccess"));
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!match?.userSignup?.id) throw new Error("No signup found");
      const res = await client.api.matches[":id"].signup[":signupId"].$patch({
        param: { id: matchId!, signupId: match.userSignup.id },
        json: { status: "CANCELLED" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any).error || "Failed to cancel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      Alert.alert(t("matchDetail.cancelSuccess"));
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "PAID":
        return "default";
      case "PENDING":
        return "secondary";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleShare = async () => {
    if (!match) return;
    try {
      await Share.share({
        message: `Football Match on ${formatDate(match.date)} at ${match.time}`,
        title: t("share.title"),
      });
    } catch (err) {
      console.error("Share error:", err);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!match) return;
    const message = `Football Match on ${formatDate(match.date)} at ${match.time}`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Error", "WhatsApp is not installed");
    }
  };

  const paidPlayers = match?.signups.filter((s) => s.status === "PAID") || [];
  const pendingPlayers = match?.signups.filter((s) => s.status === "PENDING") || [];
  const cancelledPlayers = match?.signups.filter((s) => s.status === "CANCELLED") || [];
  const isCancelled = match?.status === "cancelled";

  if (isLoading) {
    return (
      <Container variant="padded">
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" />
          <Text marginTop="$2" color="$gray11">
            {t("shared.loading")}
          </Text>
        </YStack>
      </Container>
    );
  }

  if (error || !match) {
    return (
      <Container variant="padded">
        <Card variant="outlined" backgroundColor="$red2">
          <YStack padding="$3">
            <Text color="$red11">{t("matches.error")}</Text>
          </YStack>
        </Card>
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
          {/* Match Header */}
          <Card variant="elevated">
            <YStack padding="$4" gap="$3">
              {isCancelled && (
                <Badge variant="destructive" alignSelf="flex-start">
                  {t("matchDetail.matchCancelled")}
                </Badge>
              )}

              <Text fontSize="$7" fontWeight="bold">
                {formatDate(match.date)}
              </Text>

              <XStack gap="$4" flexWrap="wrap">
                <YStack>
                  <Text fontSize="$3" color="$gray10">
                    {t("shared.time")}
                  </Text>
                  <Text fontSize="$5" fontWeight="600">
                    {match.time}
                  </Text>
                </YStack>

                {match.location && (
                  <YStack flex={1}>
                    <Text fontSize="$3" color="$gray10">
                      {t("stats.location")}
                    </Text>
                    <Text fontSize="$5">
                      {match.location.name}
                      {match.court && ` - ${match.court.name}`}
                    </Text>
                  </YStack>
                )}
              </XStack>

              {/* Share Buttons */}
              <XStack gap="$2" marginTop="$2">
                <Button variant="outline" size="$3" flex={1} onPress={handleShare}>
                  {t("share.copyLink")}
                </Button>
                <Button variant="outline" size="$3" flex={1} onPress={handleWhatsAppShare}>
                  {t("share.whatsapp")}
                </Button>
              </XStack>
            </YStack>
          </Card>

          {/* Match Stats */}
          <Card variant="outlined">
            <XStack padding="$4" justifyContent="space-around">
              <YStack alignItems="center">
                <Text fontSize="$7" fontWeight="bold" color="$green10">
                  {paidPlayers.length}
                </Text>
                <Text fontSize="$3" color="$gray10">
                  {t("stats.paid")}
                </Text>
              </YStack>

              <YStack alignItems="center">
                <Text fontSize="$7" fontWeight="bold">
                  {match.maxPlayers}
                </Text>
                <Text fontSize="$3" color="$gray10">
                  {t("stats.max")}
                </Text>
              </YStack>

              {match.costPerPlayer && (
                <YStack alignItems="center">
                  <Text fontSize="$7" fontWeight="bold">
                    {match.costPerPlayer}
                  </Text>
                  <Text fontSize="$3" color="$gray10">
                    {t("stats.cost")}
                  </Text>
                </YStack>
              )}

              {match.court && (
                <YStack alignItems="center">
                  <Text fontSize="$7" fontWeight="bold">
                    {match.court.name}
                  </Text>
                  <Text fontSize="$3" color="$gray10">
                    {t("stats.court")}
                  </Text>
                </YStack>
              )}
            </XStack>
          </Card>

          {/* Action Buttons */}
          {!isCancelled && userId && (
            <Card variant="outlined">
              <YStack padding="$4" gap="$3">
                {match.isUserSignedUp ? (
                  <>
                    <YStack alignItems="center" gap="$1">
                      <Text fontSize="$5" fontWeight="600" color="$green10">
                        {t("actions.in")}
                      </Text>
                      <Text color="$gray11">{t("actions.cancelOrGuest")}</Text>
                    </YStack>

                    <XStack gap="$2">
                      <Button
                        variant="outline"
                        flex={1}
                        onPress={() => setShowGuestDialog(true)}
                        disabled={match.availableSpots === 0}
                      >
                        {t("actions.signUpGuest")}
                      </Button>
                      <Button
                        variant="danger"
                        flex={1}
                        onPress={() => cancelMutation.mutate()}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending
                          ? t("actions.cancelling")
                          : t("actions.cancel")}
                      </Button>
                    </XStack>
                  </>
                ) : (
                  <YStack gap="$3">
                    {match.availableSpots > 0 ? (
                      <>
                        <Text textAlign="center" color="$blue10" fontWeight="600">
                          {t("actions.spotsLeft", { count: match.availableSpots })}
                        </Text>
                        <Button
                          variant="primary"
                          onPress={() => signupMutation.mutate()}
                          disabled={signupMutation.isPending}
                        >
                          {signupMutation.isPending
                            ? t("actions.joining")
                            : t("actions.join")}
                        </Button>
                      </>
                    ) : (
                      <Text textAlign="center" color="$red10" fontWeight="600">
                        {t("actions.matchFull")}
                      </Text>
                    )}
                  </YStack>
                )}
              </YStack>
            </Card>
          )}

          {/* Players List */}
          <Card variant="elevated">
            <YStack padding="$4" gap="$3">
              <Text fontSize="$6" fontWeight="bold">
                {t("players.title")} ({match.signups.length})
              </Text>

              {match.signups.length === 0 ? (
                <Text color="$gray11">{t("players.noPlayers")}</Text>
              ) : (
                <YStack gap="$2">
                  {/* Paid Players */}
                  {paidPlayers.map((player) => (
                    <XStack
                      key={player.id}
                      justifyContent="space-between"
                      alignItems="center"
                      paddingVertical="$2"
                      borderBottomWidth={1}
                      borderBottomColor="$borderColor"
                    >
                      <YStack>
                        <Text fontWeight="500">
                          {player.playerName}
                          {player.signupType === "guest" && ` ${t("players.guest")}`}
                        </Text>
                      </YStack>
                      <Badge variant={getStatusBadgeVariant(player.status)}>
                        {t(`status.${player.status.toLowerCase()}`)}
                      </Badge>
                    </XStack>
                  ))}

                  {/* Pending Players */}
                  {pendingPlayers.map((player) => (
                    <XStack
                      key={player.id}
                      justifyContent="space-between"
                      alignItems="center"
                      paddingVertical="$2"
                      borderBottomWidth={1}
                      borderBottomColor="$borderColor"
                    >
                      <YStack>
                        <Text fontWeight="500">
                          {player.playerName}
                          {player.signupType === "guest" && ` ${t("players.guest")}`}
                        </Text>
                      </YStack>
                      <Badge variant={getStatusBadgeVariant(player.status)}>
                        {t(`status.${player.status.toLowerCase()}`)}
                      </Badge>
                    </XStack>
                  ))}

                  {/* Cancelled Players */}
                  {cancelledPlayers.length > 0 && (
                    <>
                      <Text
                        fontSize="$4"
                        fontWeight="600"
                        color="$gray10"
                        marginTop="$2"
                      >
                        {t("players.cancelledSection")}
                      </Text>
                      {cancelledPlayers.map((player) => (
                        <XStack
                          key={player.id}
                          justifyContent="space-between"
                          alignItems="center"
                          paddingVertical="$2"
                          opacity={0.6}
                        >
                          <Text>{player.playerName}</Text>
                          <Badge variant="destructive">
                            {t("status.cancelled")}
                          </Badge>
                        </XStack>
                      ))}
                    </>
                  )}
                </YStack>
              )}
            </YStack>
          </Card>

          {/* Rules Button */}
          <Button variant="outline" onPress={() => router.push("/(tabs)/rules")}>
            {t("matchDetail.viewRules")}
          </Button>
        </YStack>
      </ScrollView>

      {/* Guest Signup Dialog */}
      <Dialog
        open={showGuestDialog}
        onOpenChange={setShowGuestDialog}
        title={t("guest.title")}
      >
        <YStack gap="$4" padding="$4">
          <Input
            label={t("guest.label")}
            placeholder={t("guest.placeholder")}
            value={guestName}
            onChangeText={setGuestName}
          />
          <XStack gap="$2">
            <Button
              variant="outline"
              flex={1}
              onPress={() => setShowGuestDialog(false)}
            >
              {t("shared.cancel")}
            </Button>
            <Button
              variant="primary"
              flex={1}
              onPress={() => {
                // TODO: Implement guest signup
                Alert.alert(t("matchDetail.guestAddSuccess"));
                setShowGuestDialog(false);
                setGuestName("");
              }}
            >
              {t("guest.add")}
            </Button>
          </XStack>
        </YStack>
      </Dialog>
    </Container>
  );
}
