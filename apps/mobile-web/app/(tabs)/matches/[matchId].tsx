import { useState } from "react";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Spinner,
  Button,
  Dialog,
  Input,
  StatusBadge,
  PlayersTable,
  type PlayerRow,
  type PlayerAction,
  type PlayerStatusType,
} from "@repo/ui";
import {
  useQuery,
  useMutation,
  useQueryClient,
  client,
  useSession,
} from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, router } from "expo-router";
import { RefreshControl, ScrollView, Share, Linking, Alert } from "react-native";
import {
  CreditCard,
  MessageCircle,
  X,
  Calendar,
  UserPlus,
  RotateCcw,
} from "@tamagui/lucide-icons";

interface Signup {
  id: string;
  matchId: string;
  userId?: string;
  playerName: string;
  playerEmail: string;
  status: PlayerStatusType;
  signupType: "self" | "guest";
  guestOwnerId?: string;
  addedByUserId: string;
  addedByName?: string;
}

interface MatchDetails {
  id: string;
  date: string;
  time: string;
  status: string;
  maxPlayers: number;
  maxSubstitutes?: number;
  costPerPlayer?: string;
  sameDayCost?: string;
  paymentMethod?: string;
  location?: { id: string; name: string; address?: string };
  court?: { id: string; name: string };
  signups: Signup[];
  availableSpots: number;
  availableSubstituteSpots?: number;
  isUserSignedUp?: boolean;
  userSignup?: Signup;
}

export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showJoinModal, setShowJoinModal] = useState(false);
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
        throw new Error((data as { error?: string }).error || "Failed to sign up");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      setShowJoinModal(false);
      Alert.alert(t("matchDetail.signupSuccess"));
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const updateSignupMutation = useMutation({
    mutationFn: async ({
      signupId,
      status,
    }: {
      signupId: string;
      status: PlayerStatusType;
    }) => {
      const res = await client.api.matches[":id"].signup[":signupId"].$patch({
        param: { id: matchId!, signupId },
        json: { status },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { error?: string }).error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message);
    },
  });

  const addGuestMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await client.api.matches[":id"].guest.$post({
        param: { id: matchId! },
        json: {
          matchId: matchId!,
          guestName: name,
          status: "PENDING",
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { error?: string }).error || "Failed to add guest");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      setShowGuestDialog(false);
      setGuestName("");
      Alert.alert(t("matchDetail.guestAddSuccess"));
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

  const handleCancelSignup = (signupId: string, currentStatus: PlayerStatusType) => {
    if (currentStatus === "PENDING") {
      // For PENDING users, we would delete the signup entirely
      // For now, we'll just mark as cancelled since delete endpoint may not exist
      updateSignupMutation.mutate({ signupId, status: "CANCELLED" });
    } else {
      // For PAID users, mark as cancelled
      updateSignupMutation.mutate({ signupId, status: "CANCELLED" });
    }
  };

  const handleRejoin = (signupId: string) => {
    updateSignupMutation.mutate({ signupId, status: "PENDING" });
  };

  const handleOpenPayment = () => {
    // Open PayPal link from environment variable
    const paypalUrl = process.env.EXPO_PUBLIC_PAYPAL_URL;
    if (paypalUrl) {
      Linking.openURL(paypalUrl).catch(() => {
        Alert.alert("Error", t("matchDetail.paymentOpenError"));
      });
    } else {
      Alert.alert(t("matchDetail.noPaymentMethod"));
    }
  };

  const handleNotifyPaid = () => {
    // Open WhatsApp to notify organizer using wa.me link with phone number
    const organizerPhone = process.env.EXPO_PUBLIC_ORGANIZER_WHATSAPP;
    if (!organizerPhone) {
      Alert.alert("Error", t("matchDetail.noOrganizerPhone"));
      return;
    }
    const message = t("notify.whatsappMessage", {
      date: formatDate(match?.date || ""),
      name: session?.user?.name || "",
    });
    const url = `https://wa.me/${organizerPhone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", t("matchDetail.whatsappError"));
    });
  };

  const handleAddToCalendar = () => {
    if (!match) return;
    // Generate ICS file content
    const icsContent = generateICS(match);
    // For now, share via native share
    Share.share({
      message: icsContent,
      title: t("shared.addToCalendar"),
    });
  };

  const generateICS = (matchData: MatchDetails): string => {
    const date = new Date(matchData.date);
    const [hours, minutes] = matchData.time.split(":");
    date.setHours(parseInt(hours), parseInt(minutes));

    const endDate = new Date(date);
    endDate.setHours(endDate.getHours() + 2);

    const formatICSDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatICSDate(date)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Football Match
LOCATION:${matchData.location?.name || ""}${matchData.court ? ` - ${matchData.court.name}` : ""}
END:VEVENT
END:VCALENDAR`;
  };

  const getPlayerActions = (player: Signup): PlayerAction[] => {
    const isOwn = player.userId === userId;
    const canAct = isAdmin || isOwn;

    if (!canAct) return [];

    const actions: PlayerAction[] = [];

    switch (player.status) {
      case "PENDING":
        // Pay, Notify I paid, Cancel
        actions.push({
          icon: CreditCard,
          label: t("matchDetail.pay"),
          onPress: handleOpenPayment,
          variant: "outline",
        });
        actions.push({
          icon: MessageCircle,
          label: t("notify.trigger"),
          onPress: handleNotifyPaid,
          variant: "outline",
        });
        actions.push({
          icon: X,
          label: t("actions.cancel"),
          onPress: () => handleCancelSignup(player.id, player.status),
          variant: "danger",
        });
        break;

      case "PAID":
        // Cancel, Add to calendar, Invite friend
        actions.push({
          icon: X,
          label: t("actions.cancel"),
          onPress: () => handleCancelSignup(player.id, player.status),
          variant: "danger",
        });
        actions.push({
          icon: Calendar,
          label: t("shared.addToCalendar"),
          onPress: handleAddToCalendar,
          variant: "outline",
        });
        if (isOwn) {
          actions.push({
            icon: UserPlus,
            label: t("actions.signUpGuest"),
            onPress: () => setShowGuestDialog(true),
            variant: "outline",
          });
        }
        break;

      case "CANCELLED":
        // Rejoin, Notify can't play
        actions.push({
          icon: RotateCcw,
          label: t("matchDetail.rejoin"),
          onPress: () => handleRejoin(player.id),
          variant: "primary",
        });
        actions.push({
          icon: MessageCircle,
          label: t("notify.cantPlay"),
          onPress: handleNotifyPaid,
          variant: "outline",
        });
        break;

      case "SUBSTITUTE":
        // Show actions similar to PENDING, but indicate they're on waitlist
        actions.push({
          icon: X,
          label: t("actions.cancel"),
          onPress: () => handleCancelSignup(player.id, player.status),
          variant: "danger",
        });
        break;
    }

    return actions;
  };

  const buildPlayerRows = (): PlayerRow[] => {
    if (!match || !match.signups) return [];

    return match.signups.map((signup) => ({
      id: signup.id,
      name: signup.playerName,
      status: signup.status,
      isGuest: signup.signupType === "guest",
      addedByName: signup.addedByName,
      isCurrentUser: signup.userId === userId,
      actions: getPlayerActions(signup),
    }));
  };

  const paidCount = match?.signups?.filter((s) => s.status === "PAID").length || 0;
  const pendingCount =
    match?.signups?.filter((s) => s.status === "PENDING").length || 0;
  const substituteCount =
    match?.signups?.filter((s) => s.status === "SUBSTITUTE").length || 0;
  const activeCount = paidCount + pendingCount;
  const isCancelled = match?.status === "cancelled";
  const isParticipating = match?.isUserSignedUp;
  const isUserSubstitute = match?.userSignup?.status === "SUBSTITUTE";

  // Check if match is today for same-day cost
  const isMatchToday = match ? (() => {
    const today = new Date();
    const matchDate = new Date(match.date);
    return (
      today.getFullYear() === matchDate.getFullYear() &&
      today.getMonth() === matchDate.getMonth() &&
      today.getDate() === matchDate.getDate()
    );
  })() : false;

  // Calculate total cost for same-day matches
  const baseCost = parseFloat(match?.costPerPlayer || "0");
  const sameDayCost = isMatchToday ? parseFloat(match?.sameDayCost || "0") : 0;
  const totalCost = baseCost + sameDayCost;

  const statusLabels: Record<PlayerStatusType, string> = {
    PENDING: t("status.pending"),
    PAID: t("status.paid"),
    CANCELLED: t("status.cancelled"),
    SUBSTITUTE: t("status.substitute"),
  };

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
        <YStack gap="$3" paddingBottom="$6">
          {/* Match Header Card */}
          <Card variant="elevated">
            <YStack padding="$3" gap="$2">
              {isCancelled && (
                <StatusBadge
                  status="cancelled"
                  type="match"
                  label={t("matchDetail.matchCancelled")}
                />
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
            </YStack>
          </Card>

          {/* Stats Card */}
          <Card variant="outlined">
            <XStack padding="$3" justifyContent="space-around">
              <YStack alignItems="center">
                <Text fontSize="$7" fontWeight="bold" color="$green10">
                  {activeCount}
                </Text>
                <Text fontSize="$3" color="$gray10">
                  {t("players.title")}
                </Text>
              </YStack>

              <YStack alignItems="center">
                <Text fontSize="$7" fontWeight="bold">
                  {match.availableSpots}
                </Text>
                <Text fontSize="$3" color="$gray10">
                  {t("stats.availableSpots")}
                </Text>
              </YStack>

              {match.maxSubstitutes !== undefined && match.maxSubstitutes > 0 && (
                <YStack alignItems="center">
                  <Text fontSize="$7" fontWeight="bold" color="$blue10">
                    {match.availableSubstituteSpots ?? match.maxSubstitutes}
                  </Text>
                  <Text fontSize="$3" color="$gray10">
                    {t("stats.substitutes")}
                  </Text>
                </YStack>
              )}

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
            </XStack>
          </Card>

          {/* View A: Not Participating - Show CTA */}
          {!isParticipating && !isCancelled && userId && (
            <Card variant="outlined">
              <YStack padding="$3" gap="$2" alignItems="center">
                {match.availableSpots > 0 ? (
                  <>
                    <Text fontSize="$5" fontWeight="600" color="$blue10">
                      {t("actions.spotsLeft", { count: match.availableSpots })}
                    </Text>
                    <Button
                      variant="primary"
                      size="$5"
                      onPress={() => setShowJoinModal(true)}
                    >
                      {t("actions.wantToPlay")}
                    </Button>
                  </>
                ) : match.maxSubstitutes && match.maxSubstitutes > 0 && substituteCount < match.maxSubstitutes ? (
                  <>
                    <Text fontSize="$5" fontWeight="600" color="$orange10">
                      {t("actions.matchFull")}
                    </Text>
                    <Text fontSize="$3" color="$gray11" textAlign="center">
                      {t("matchDetail.substituteList")} ({match.maxSubstitutes - substituteCount} {t("stats.availableSpots").toLowerCase()})
                    </Text>
                    <Button
                      variant="outline"
                      size="$4"
                      onPress={() => setShowJoinModal(true)}
                    >
                      {t("actions.wantToPlay")}
                    </Button>
                  </>
                ) : (
                  <Text fontSize="$5" fontWeight="600" color="$red10">
                    {t("matchDetail.matchCompletelyFull")}
                  </Text>
                )}
              </YStack>
            </Card>
          )}

          {/* View: User is on Substitute List */}
          {isUserSubstitute && (
            <Card variant="outlined" backgroundColor="$blue2">
              <YStack padding="$3" gap="$2" alignItems="center">
                <StatusBadge
                  status="SUBSTITUTE"
                  type="player"
                  label={t("matchDetail.youAreSubstitute")}
                />
                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {t("matchDetail.substitutePosition", {
                    position: match?.signups?.filter((s) => s.status === "SUBSTITUTE").findIndex((s) => s.id === match.userSignup?.id) + 1
                  })}
                </Text>
              </YStack>
            </Card>
          )}

          {/* View B: Participating - Show Players Table */}
          {isParticipating && (
            <Card variant="elevated">
              <YStack gap="$2">
                <XStack
                  paddingHorizontal="$3"
                  paddingTop="$3"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Text fontSize="$6" fontWeight="bold">
                    {t("players.title")} ({match.signups?.length || 0})
                  </Text>
                  {match.userSignup?.status === "PAID" && (
                    <Button
                      variant="outline"
                      size="$3"
                      onPress={() => setShowGuestDialog(true)}
                      disabled={match.availableSpots === 0}
                    >
                      <UserPlus size={16} />
                      <Text marginLeft="$1">{t("actions.signUpGuest")}</Text>
                    </Button>
                  )}
                </XStack>

                <PlayersTable
                  players={buildPlayerRows()}
                  isAdmin={isAdmin}
                  emptyMessage={t("players.noPlayers")}
                  statusLabels={statusLabels}
                />
              </YStack>
            </Card>
          )}

          {/* Not logged in prompt */}
          {!userId && !isCancelled && (
            <Card variant="outlined">
              <YStack padding="$3" gap="$2" alignItems="center">
                <Text color="$gray11" textAlign="center">
                  {t("home.signInPrompt")}
                </Text>
                <Button
                  variant="primary"
                  onPress={() => router.push("/(auth)/sign-in")}
                >
                  {t("shared.signIn")}
                </Button>
              </YStack>
            </Card>
          )}

          {/* Rules Button */}
          <Button variant="outline" onPress={() => router.push("/(tabs)/rules")}>
            {t("matchDetail.viewRules")}
          </Button>
        </YStack>
      </ScrollView>

      {/* Join Modal with Payment Info and Rules */}
      <Dialog
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        title={t("actions.wantToPlay")}
      >
        <YStack gap="$4" padding="$4">
          {/* Payment Information */}
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="600">
              {t("matchDetail.paymentInfo")}
            </Text>
            {match.costPerPlayer && (
              <XStack justifyContent="space-between">
                <Text color="$gray11">{t("stats.cost")}</Text>
                <Text fontWeight="500">{match.costPerPlayer}</Text>
              </XStack>
            )}
            {isMatchToday && match.sameDayCost && parseFloat(match.sameDayCost) > 0 && (
              <XStack justifyContent="space-between">
                <Text color="$orange10">{t("matchDetail.sameDayFee")}</Text>
                <Text fontWeight="500" color="$orange10">+{match.sameDayCost}</Text>
              </XStack>
            )}
            {isMatchToday && match.sameDayCost && parseFloat(match.sameDayCost) > 0 && match.costPerPlayer && (
              <XStack justifyContent="space-between" paddingTop="$1" borderTopWidth={1} borderColor="$gray6">
                <Text fontWeight="600">{t("matchDetail.totalCost")}</Text>
                <Text fontWeight="700" fontSize="$5">{totalCost}</Text>
              </XStack>
            )}
            {process.env.EXPO_PUBLIC_PAYPAL_URL && (
              <XStack justifyContent="space-between">
                <Text color="$gray11">{t("matchDetail.paymentMethod")}</Text>
                <Text fontWeight="500" color="$blue10">PayPal</Text>
              </XStack>
            )}
          </YStack>

          {/* Key Rules */}
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="600">
              {t("matchDetail.keyRules")}
            </Text>
            <YStack gap="$1">
              <Text color="$gray11" fontSize="$3">
                • {t("rules.general.0")}
              </Text>
              <Text color="$gray11" fontSize="$3">
                • {t("rules.general.1")}
              </Text>
              <Text color="$gray11" fontSize="$3">
                • {t("rules.general.3")}
              </Text>
            </YStack>
          </YStack>

          <XStack gap="$2">
            <Button
              variant="outline"
              flex={1}
              onPress={() => setShowJoinModal(false)}
            >
              {t("shared.cancel")}
            </Button>
            <Button
              variant="primary"
              flex={1}
              onPress={() => signupMutation.mutate()}
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending
                ? t("actions.joining")
                : t("actions.join")}
            </Button>
          </XStack>
        </YStack>
      </Dialog>

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
                if (guestName.trim()) {
                  addGuestMutation.mutate(guestName.trim());
                }
              }}
              disabled={!guestName.trim() || addGuestMutation.isPending}
            >
              {addGuestMutation.isPending ? t("guest.adding") : t("guest.add")}
            </Button>
          </XStack>
        </YStack>
      </Dialog>
    </Container>
  );
}
