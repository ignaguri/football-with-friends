// @ts-nocheck - Tamagui type recursion workaround
import {
  useQuery,
  useMutation,
  useQueryClient,
  client,
  useSession,
  useCurrentGroup,
  useGroupRoster,
  type GroupRosterEntry,
} from "@repo/api-client";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Spinner,
  Button,
  Dialog,
  AlertDialog,
  Input,
  StatusBadge,
  PlayersTable,
  List,
  type PlayerRow,
  type PlayerAction,
  type PlayerStatusType,
  useToastController,
} from "@repo/ui";
import {
  BanknoteArrowDown,
  X,
  Calendar,
  UserPlus,
  RotateCcw,
  Share2,
  Pencil,
  Trash2,
  Image as ImageIcon,
  ChevronRight,
} from "@tamagui/lucide-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { formatMatchDate } from "@repo/shared/utils";

import { formatFullDate } from "@/lib/date-utils";
import {
  generateICS as generateICSFromUtils,
  getGoogleCalendarUrl,
  openGoogleCalendar,
} from "@/lib/calendar-utils";

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
  playerNationality?: string;
  playerUsername?: string | null;
  playerDisplayUsername?: string | null;
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

// WhatsApp icon component using the existing SVG
function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <Image
      source={require("@/assets/whatsapp-logo.svg")}
      style={{ width: size, height: size }}
      pointerEvents="none"
    />
  );
}

function PayPalIcon({ size = 20 }: { size?: number }) {
  return (
    <Image
      source={require("@/assets/paypal-logo.svg")}
      style={{ width: size, height: size }}
      pointerEvents="none"
    />
  );
}

export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const toast = useToastController();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [guestMode, setGuestMode] = useState<"pick" | "quick">("pick");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const { groupId: currentGroupId, myRole } = useCurrentGroup();
  const isOrganizer =
    myRole === "organizer" || session?.user?.role === "admin";
  // Roster list is organizer-only; don't trigger a 403 for regular members.
  const rosterForGuest = useGroupRoster(
    showGuestDialog && isOrganizer ? currentGroupId : null,
  );
  const filteredRoster = useMemo(() => {
    const entries = rosterForGuest.data ?? [];
    const q = guestSearch.trim().toLowerCase();
    return q
      ? entries.filter((e: GroupRosterEntry) =>
          e.displayName.toLowerCase().includes(q),
        )
      : entries;
  }, [rosterForGuest.data, guestSearch]);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [signupToCancel, setSignupToCancel] = useState<{
    id: string;
    status: PlayerStatusType;
  } | null>(null);
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [editingSignup, setEditingSignup] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editedName, setEditedName] = useState("");
  const [showRemoveAlert, setShowRemoveAlert] = useState(false);
  const [signupToRemove, setSignupToRemove] = useState<string | null>(null);

  const userId = session?.user?.id;
  // Historically `isAdmin` gated organizer actions (edit name, remove player,
  // guest quick-add). Keep the name but widen it to the group-relative role
  // so organizers of the active group get the same affordances as the
  // platform admin.
  const isAdmin = isOrganizer;

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

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await client.api.settings.$get();
      return res.json();
    },
  });

  const { data: mediaCountData } = useQuery({
    queryKey: ["matchMediaCount", matchId],
    queryFn: async () => {
      const res = await client.api["match-media"][":matchId"].count.$get({
        param: { matchId: matchId! },
      });
      if (!res.ok) return { count: 0 };
      return (await res.json()) as { count: number };
    },
    enabled: !!matchId,
  });
  const mediaCount = mediaCountData?.count ?? 0;

  const signupMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.matches[":id"].signup.$post({
        param: { id: matchId! },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          (data as { error?: string }).error || "Failed to sign up",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      setShowJoinModal(false);
      setShowConfirmationModal(true);
    },
    onError: (err: Error) => {
      toast.show(err.message, { duration: 4000, customData: { variant: "error" } });
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
        throw new Error(
          (data as { error?: string }).error || "Failed to update",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: (err: Error) => {
      toast.show(err.message, { duration: 4000, customData: { variant: "error" } });
    },
  });

  const addGuestMutation = useMutation({
    mutationFn: async (
      input:
        | { rosterId: string }
        | { guestName: string; phone?: string; email?: string },
    ) => {
      const res = await client.api.matches[":id"].guest.$post({
        param: { id: matchId! },
        json: { ...input, status: "PENDING" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          (data as { error?: string }).error || "Failed to add guest",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      setShowGuestDialog(false);
      setGuestName("");
      setGuestPhone("");
      setGuestEmail("");
      toast.show(t("matchDetail.guestAddSuccess"), { duration: 3000, customData: { variant: "success" } });
    },
    onError: (err: Error) => {
      toast.show(err.message, { duration: 4000, customData: { variant: "error" } });
    },
  });

  const editPlayerNameMutation = useMutation({
    mutationFn: async ({
      signupId,
      playerName,
    }: {
      signupId: string;
      playerName: string;
    }) => {
      const res = await client.api.matches[":id"].signup[":signupId"].$patch({
        param: { id: matchId!, signupId },
        json: { playerName },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          (data as { error?: string }).error || "Failed to update name",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      setShowEditNameDialog(false);
      setEditingSignup(null);
      setEditedName("");
    },
    onError: (err: Error) => {
      toast.show(err.message, { duration: 4000, customData: { variant: "error" } });
    },
  });

  const removePlayerMutation = useMutation({
    mutationFn: async (signupId: string) => {
      const res = await client.api.matches[":id"].signup[":signupId"].$delete({
        param: { id: matchId!, signupId },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          (data as { error?: string }).error || "Failed to remove player",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    },
    onError: (err: Error) => {
      toast.show(err.message, { duration: 4000, customData: { variant: "error" } });
    },
  });

  const handleCancelSignup = (
    signupId: string,
    currentStatus: PlayerStatusType,
  ) => {
    setSignupToCancel({ id: signupId, status: currentStatus });
    setShowCancelAlert(true);
  };

  const confirmCancelSignup = () => {
    if (!signupToCancel) return;

    if (signupToCancel.status === "PENDING") {
      // For PENDING users, we would delete the signup entirely
      // For now, we'll just mark as cancelled since delete endpoint may not exist
      updateSignupMutation.mutate({
        signupId: signupToCancel.id,
        status: "CANCELLED",
      });
    } else {
      // For PAID users, mark as cancelled
      updateSignupMutation.mutate({
        signupId: signupToCancel.id,
        status: "CANCELLED",
      });
    }

    setShowCancelAlert(false);
    setSignupToCancel(null);
  };

  const handleRejoin = (signupId: string) => {
    updateSignupMutation.mutate({ signupId, status: "PENDING" });
  };

  const handleMarkAsPaid = (signupId: string) => {
    updateSignupMutation.mutate({ signupId, status: "PAID" });
  };

  const handleEditPlayerName = (signupId: string, currentName: string) => {
    setEditingSignup({ id: signupId, name: currentName });
    setEditedName(currentName);
    setShowEditNameDialog(true);
  };

  const handleRemovePlayer = (signupId: string) => {
    setSignupToRemove(signupId);
    setShowRemoveAlert(true);
  };

  const confirmRemovePlayer = () => {
    if (!signupToRemove) return;
    removePlayerMutation.mutate(signupToRemove);
    setShowRemoveAlert(false);
    setSignupToRemove(null);
  };

  const handleOpenPayment = () => {
    const paypalUrl = settings?.paypal_url;
    if (paypalUrl) {
      Linking.openURL(paypalUrl).catch(() => {
        toast.show(t("matchDetail.paymentOpenError"), { duration: 4000, customData: { variant: "error" } });
      });
    } else {
      toast.show(t("matchDetail.noPaymentMethod"), { duration: 4000, customData: { variant: "error" } });
    }
  };

  const handleNotifyPaid = () => {
    // Open WhatsApp to notify organizer using wa.me link with phone number
    const organizerPhone = settings?.organizer_whatsapp;
    if (!organizerPhone) {
      toast.show(t("matchDetail.noOrganizerPhone"), { duration: 4000, customData: { variant: "error" } });
      return;
    }
    const message = t("notify.whatsappMessage", {
      date: formatFullDate(match?.date || ""),
      name: session?.user?.name || "",
    });
    const url = `https://wa.me/${organizerPhone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      toast.show(t("matchDetail.whatsappError"), { duration: 4000, customData: { variant: "error" } });
    });
  };

  const handleAddToCalendar = () => {
    if (!match) return;
    const location = match.location?.name
      ? `${match.location.name}${match.court ? ` - ${match.court.name}` : ""}`
      : undefined;

    if (Platform.OS === "web") {
      // On web, open Google Calendar directly (best cross-browser experience)
      const url = getGoogleCalendarUrl({
        date: match.date,
        time: match.time,
        location,
      });
      openGoogleCalendar(url);
    } else {
      // On native, use share sheet with ICS content
      const icsContent = generateICSFromUtils({
        date: match.date,
        time: match.time,
        location,
      });
      Share.share({
        message: icsContent,
        title: t("shared.addToCalendar"),
      });
    }
  };

  const handleShareMatch = () => {
    if (!match) return;
    const baseUrl =
      (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_WEB_BASE_URL) ||
      "https://footballwithfriends.vercel.app";
    const matchUrl =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.href
        : `${baseUrl}/matches/${encodeURIComponent(String(matchId))}`;
    const message = `${t("shared.footballMatch")} - ${formatFullDate(match.date)} ${t("shared.at")} ${match.time}\n${match.location?.name || ""}\n\n${t("shared.joinUs")}!\n${matchUrl}`;
    Share.share({
      message,
      title: t("shared.share"),
    });
  };

  const getPlayerActions = (player: Signup): PlayerAction[] => {
    // No actions for played matches
    if (isPlayed) return [];

    const isOwn = player.userId === userId;
    const canAct = isAdmin || isOwn;

    if (!canAct) return [];

    const actions: PlayerAction[] = [];

    const testIDBase = `match-detail-player-${player.id}`;

    // Admin: edit guest player name
    if (isAdmin && player.signupType === "guest") {
      actions.push({
        icon: Pencil,
        label: t("matchDetail.editName"),
        onPress: () => handleEditPlayerName(player.id, player.playerName),
        variant: "outline",
        testID: `${testIDBase}-edit-name`,
      });
    }

    switch (player.status) {
      case "PENDING":
        if (isAdmin) {
          // Admin can directly mark as paid (including themselves)
          actions.push({
            icon: BanknoteArrowDown,
            label: t("matchDetail.markPaid"),
            onPress: () => handleMarkAsPaid(player.id),
            variant: "outline",
            testID: `${testIDBase}-mark-paid`,
          });
        } else if (isOwn) {
          // Non-admin players get Pay and Notify options
          actions.push({
            icon: PayPalIcon,
            label: t("matchDetail.pay"),
            onPress: handleOpenPayment,
            variant: "outline",
            testID: `${testIDBase}-pay`,
          });
          actions.push({
            icon: WhatsAppIcon,
            label: t("notify.trigger"),
            onPress: handleNotifyPaid,
            variant: "outline",
            testID: `${testIDBase}-notify`,
          });
        }
        actions.push({
          icon: X,
          label: t("actions.cancel"),
          onPress: () => handleCancelSignup(player.id, player.status),
          variant: "danger-outline",
          testID: `${testIDBase}-cancel`,
        });
        break;

      case "PAID":
        actions.push({
          icon: X,
          label: t("actions.cancel"),
          onPress: () => handleCancelSignup(player.id, player.status),
          variant: "danger-outline",
          testID: `${testIDBase}-cancel`,
        });
        break;

      case "CANCELLED":
        // Rejoin, Notify can't play
        actions.push({
          icon: RotateCcw,
          label: t("matchDetail.rejoin"),
          onPress: () => handleRejoin(player.id),
          variant: "primary",
          testID: `${testIDBase}-rejoin`,
        });
        actions.push({
          icon: WhatsAppIcon,
          label: t("notify.cantPlay"),
          onPress: handleNotifyPaid,
          variant: "outline",
          testID: `${testIDBase}-cant-play`,
        });
        break;
    }

    // Admin: remove player entirely
    if (isAdmin) {
      actions.push({
        icon: Trash2,
        label: t("matchDetail.removePlayer"),
        onPress: () => handleRemovePlayer(player.id),
        variant: "danger-outline",
        testID: `${testIDBase}-remove`,
      });
    }

    return actions;
  };

  const buildPlayerRows = (): PlayerRow[] => {
    if (!match || !match.signups) return [];

    return match.signups.map((signup) => ({
      id: signup.id,
      name: signup.playerName,
      username: signup.playerUsername ?? null,
      displayUsername: signup.playerDisplayUsername ?? null,
      status: signup.status,
      nationality: signup.playerNationality,
      isGuest: signup.signupType === "guest",
      addedByName: signup.addedByName,
      isCurrentUser: signup.userId === userId,
      actions: getPlayerActions(signup),
      testID: `match-detail-player-row-${signup.id}`,
    }));
  };

  const isCancelled = match?.status === "cancelled";
  const isPlayed = match?.status === "completed" || match?.status === "played";
  const isParticipating = match?.isUserSignedUp;

  // Check if user was a participant (PAID or PENDING, not CANCELLED)
  const userWasParticipant =
    match?.userSignup?.status === "PAID" ||
    match?.userSignup?.status === "PENDING";

  // Check if match is today (in app timezone, not device timezone)
  const isMatchToday = match
    ? formatMatchDate(new Date()) === match.date
    : false;

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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <YStack gap="$3" paddingBottom="$6">
          {/* Match Header Card */}
          <Card variant="elevated">
            <YStack padding="$3" gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <YStack flex={1}>
                  {isCancelled && (
                    <StatusBadge
                      status="cancelled"
                      type="match"
                      label={t("matchDetail.matchCancelled")}
                    />
                  )}

                  <Text fontSize="$7" fontWeight="bold">
                    {formatFullDate(match.date)}
                  </Text>
                </YStack>

                {/* Action buttons */}
                <XStack gap="$2">
                  {/* Edit Button (admin only, non-cancelled) */}
                  {isAdmin &&
                    match.status !== "cancelled" &&
                    match.status !== "completed" && (
                      <Button
                        variant="outline"
                        size="$3"
                        circular
                        onPress={() =>
                          router.push({
                            pathname: "/(tabs)/admin/edit-match",
                            params: { matchId: match.id },
                          })
                        }
                        padding="$2"
                        accessibilityLabel={t("a11y.editMatch")}
                        testID="match-detail-edit-btn"
                      >
                        <Pencil size={20} />
                      </Button>
                    )}

                  {/* Add to Calendar Button */}
                  {(isParticipating || match.userSignup?.status === "PAID") && (
                    <Button
                      variant="outline"
                      size="$3"
                      circular
                      onPress={handleAddToCalendar}
                      padding="$2"
                      accessibilityLabel={t("a11y.addToCalendar")}
                      testID="match-detail-calendar-btn"
                    >
                      <Calendar size={20} />
                    </Button>
                  )}

                  {/* Share Button */}
                  <Button
                    variant="outline"
                    size="$3"
                    circular
                    onPress={handleShareMatch}
                    padding="$2"
                    accessibilityLabel={t("a11y.shareMatch")}
                    testID="match-detail-share-btn"
                  >
                    <Share2 size={20} />
                  </Button>
                </XStack>
              </XStack>

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
                    <Text fontSize="$5">{match.location.name}</Text>
                  </YStack>
                )}
              </XStack>
            </YStack>
          </Card>

          {/* Stats Card */}
          <Card variant="outlined">
            <YStack padding="$3" gap="$2">
              <XStack justifyContent="space-around">
                <YStack alignItems="center">
                  <Text fontSize="$3" color="$gray10" marginBottom="$1">
                    {t("stats.availableSpots")}
                  </Text>
                  <Text
                    fontSize="$7"
                    fontWeight="bold"
                    color={match.availableSpots > 0 ? "$green10" : "$color"}
                  >
                    {match.availableSpots}
                  </Text>
                </YStack>

                <YStack alignItems="center">
                  <Text fontSize="$3" color="$gray10" marginBottom="$1">
                    {t("stats.cost")}
                  </Text>
                  <Text fontSize="$7" fontWeight="bold">
                    {match.costPerPlayer
                      ? `€${totalCost}`
                      : t("stats.free")}
                  </Text>
                </YStack>

                <YStack alignItems="center">
                  <Text fontSize="$3" color="$gray10" marginBottom="$1">
                    {t("stats.court")}
                  </Text>
                  <Text fontSize="$7" fontWeight="bold">
                    {match.court?.name || "-"}
                  </Text>
                </YStack>
              </XStack>

              {isMatchToday && sameDayCost > 0 && (
                <Text
                  fontSize="$2"
                  color="$orange10"
                  textAlign="center"
                >
                  {t("matchDetail.sameDayFeeHint", { amount: sameDayCost })}
                </Text>
              )}
            </YStack>
          </Card>

          {/* View A: Not Participating - Show CTA (only for upcoming matches) */}
          {!isParticipating && !isCancelled && !isPlayed && userId && (
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
                      testID="match-detail-join-btn"
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

          {/* Vote CTA for played matches where user participated */}
          {isPlayed && userWasParticipant && (
            <Button
              variant="primary"
              onPress={() =>
                router.push({
                  pathname: "/stats-voting",
                  params: { matchId: match.id },
                })
              }
            >
              {t("voting.voteForMatch")}
            </Button>
          )}

          {/* View B: Participating or Played Match - Show Players Table */}
          {(isParticipating || isPlayed || isAdmin) && (
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
                  {!isPlayed &&
                    isOrganizer &&
                    match.availableSpots > 0 && (
                      <Button
                        variant="outline"
                        size="$3"
                        onPress={() => setShowGuestDialog(true)}
                        testID="match-detail-invite-friend-btn"
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
                  guestLabel={t("players.guest")}
                  cancelledLabel={t("players.cancelledSection")}
                />
              </YStack>
            </Card>
          )}

          {/* Multimedia Gallery Card */}
          {userId && (mediaCount > 0 || isParticipating || isAdmin) && (
            <Pressable
              onPress={() => router.push(`/(tabs)/matches/${matchId}/gallery`)}
              accessibilityRole="button"
              accessibilityLabel={t("multimedia.viewGallery")}
            >
              <Card variant="elevated" padding="$4">
                <XStack alignItems="center" gap="$3">
                  <YStack
                    width={40}
                    height={40}
                    borderRadius={10}
                    backgroundColor="$purple4"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <ImageIcon size={20} color="$purple10" />
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize="$5" fontWeight="bold">
                      {t("multimedia.title")}
                    </Text>
                    <Text fontSize="$3" color="$gray11">
                      {mediaCount === 0
                        ? t("multimedia.addFirstPhoto")
                        : t("multimedia.galleryCount", { count: mediaCount })}
                    </Text>
                    {/* Note: addFirstPhoto is only shown to participants/admin since
                        the card is hidden for non-participants when count === 0. */}
                  </YStack>
                  <ChevronRight size={20} color="$gray10" />
                </XStack>
              </Card>
            </Pressable>
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
                  onPress={() => router.push("/(auth)")}
                >
                  {t("shared.signIn")}
                </Button>
              </YStack>
            </Card>
          )}

          {/* Rules Button */}
          <Button variant="outline" onPress={() => setShowRulesModal(true)}>
            {t("matchDetail.viewRules")}
          </Button>
        </YStack>
      </ScrollView>

      {/* Join Modal with Payment Info and Rules */}
      <Dialog
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        title={t("actions.wantToPlay")}
        showClose={false}
        onConfirm={() => {
          if (!signupMutation.isPending) {
            signupMutation.mutate();
          }
        }}
        onCancel={() => setShowJoinModal(false)}
        confirmText={
          signupMutation.isPending ? t("actions.joining") : t("actions.join")
        }
        cancelText={t("shared.cancel")}
      >
        {/* Payment Information */}
        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            {t("matchDetail.paymentInfo")}
          </Text>
          {match.costPerPlayer && (
            <XStack justifyContent="space-between">
              <Text color="$gray11" fontSize="$3">
                {t("stats.cost")}
              </Text>
              <Text fontWeight="500" fontSize="$3">
                {match.costPerPlayer}€
              </Text>
            </XStack>
          )}
          {isMatchToday &&
            match.sameDayCost &&
            parseFloat(match.sameDayCost) > 0 && (
              <XStack justifyContent="space-between">
                <Text color="$orange10">{t("matchDetail.sameDayFee")}</Text>
                <Text fontWeight="500" color="$orange10">
                  +{match.sameDayCost}€
                </Text>
              </XStack>
            )}
          {isMatchToday &&
            match.sameDayCost &&
            parseFloat(match.sameDayCost) > 0 &&
            match.costPerPlayer && (
              <XStack
                justifyContent="space-between"
                paddingTop="$1"
                borderTopWidth={1}
                borderColor="$gray6"
              >
                <Text fontWeight="600">{t("matchDetail.totalCost")}</Text>
                <Text fontWeight="700" fontSize="$5">
                  {totalCost}€
                </Text>
              </XStack>
            )}
          {process.env.EXPO_PUBLIC_PAYPAL_URL && (
            <XStack justifyContent="space-between">
              <Text color="$gray11" fontSize="$3">
                {t("matchDetail.paymentMethod")}
              </Text>
              <Text fontWeight="500" color="$blue10" fontSize="$3">
                PayPal
              </Text>
            </XStack>
          )}
        </YStack>

        {/* Key Rules */}
        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            {t("matchDetail.keyRules")}
          </Text>
          <List fontSize="$3" gap="$1">
            <List.Item>{t("rules.general.0")}</List.Item>
            <List.Item>{t("rules.general.1")}</List.Item>
            <List.Item>{t("rules.general.3")}</List.Item>
          </List>
        </YStack>
      </Dialog>

      {/* Guest Signup Dialog: pick from group roster OR quick-add a ghost */}
      <Dialog
        open={showGuestDialog}
        onOpenChange={(open) => {
          setShowGuestDialog(open);
          if (!open) {
            setGuestMode("pick");
            setGuestName("");
            setGuestPhone("");
            setGuestEmail("");
            setGuestSearch("");
          }
        }}
        title={t("guest.title")}
        showActions={false}
      >
        <YStack gap="$3" padding="$4" maxHeight={560}>
          <XStack gap="$2">
            <Button
              flex={1}
              variant={guestMode === "pick" ? "primary" : "outline"}
              onPress={() => setGuestMode("pick")}
              testID="guest-mode-pick"
            >
              {t("groups.roster.guestPickerTitle")}
            </Button>
            <Button
              flex={1}
              variant={guestMode === "quick" ? "primary" : "outline"}
              onPress={() => setGuestMode("quick")}
              testID="guest-mode-quick"
            >
              {t("groups.roster.quickAddTitle")}
            </Button>
          </XStack>

          {guestMode === "pick" ? (
            <>
              <Input
                placeholder={t("groups.roster.guestPickerSearch")}
                value={guestSearch}
                onChangeText={setGuestSearch}
              />
              <ScrollView style={{ maxHeight: 320 }}>
                <YStack gap="$2">
                  {filteredRoster.map((e: GroupRosterEntry) => (
                    <Button
                      key={e.id}
                      variant="outline"
                      onPress={() => addGuestMutation.mutate({ rosterId: e.id })}
                      disabled={addGuestMutation.isPending}
                      testID={`guest-roster-pick-${e.id}`}
                    >
                      {e.displayName}
                    </Button>
                  ))}
                  {filteredRoster.length === 0 && !rosterForGuest.isLoading ? (
                    <Text color="$gray11" textAlign="center">
                      {t("groups.roster.guestPickerEmpty")}
                    </Text>
                  ) : null}
                </YStack>
              </ScrollView>
            </>
          ) : (
            <YStack gap="$3">
              <Text fontSize="$2" color="$gray11">
                {t("groups.roster.quickAddHint")}
              </Text>
              <Input
                label={t("guest.label")}
                placeholder={t("guest.placeholder")}
                value={guestName}
                onChangeText={setGuestName}
              />
              <Input
                label={t("groups.roster.phone")}
                value={guestPhone}
                onChangeText={setGuestPhone}
                placeholder="+1234567890"
                keyboardType="phone-pad"
              />
              <Input
                label={t("groups.roster.email")}
                value={guestEmail}
                onChangeText={setGuestEmail}
                placeholder="name@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Button
                variant="primary"
                onPress={() =>
                  addGuestMutation.mutate({
                    guestName: guestName.trim(),
                    phone: guestPhone.trim() || undefined,
                    email: guestEmail.trim() || undefined,
                  })
                }
                disabled={!guestName.trim() || addGuestMutation.isPending}
              >
                {addGuestMutation.isPending ? t("guest.adding") : t("guest.add")}
              </Button>
            </YStack>
          )}
          <Button variant="outline" onPress={() => setShowGuestDialog(false)}>
            {t("shared.cancel")}
          </Button>
        </YStack>
      </Dialog>

      {/* Confirmation Modal after Joining */}
      <AlertDialog
        open={showConfirmationModal}
        onOpenChange={setShowConfirmationModal}
        title={t("matchDetail.confirmation")}
        confirmText={t("matchDetail.acceptConditions")}
        onConfirm={() => setShowConfirmationModal(false)}
        variant="default"
        showCancel={false}
      >
        <Trans i18nKey="matchDetail.confirmationMessage" />
      </AlertDialog>

      {/* Cancel Confirmation Alert */}
      <AlertDialog
        open={showCancelAlert}
        onOpenChange={setShowCancelAlert}
        title={t("matchDetail.cancelSpotTitle")}
        description={t("matchDetail.cancelSpotMessage")}
        cancelText={t("shared.cancel")}
        confirmText={t("matchDetail.confirmCancel")}
        onCancel={() => {
          setShowCancelAlert(false);
          setSignupToCancel(null);
        }}
        onConfirm={confirmCancelSignup}
        variant="destructive"
      />

      {/* Edit Player Name Dialog (admin, guest players) */}
      <Dialog
        open={showEditNameDialog}
        onOpenChange={setShowEditNameDialog}
        title={t("matchDetail.editName")}
        showActions={false}
      >
        <YStack gap="$4" padding="$4">
          <Input
            label={t("matchDetail.playerName")}
            value={editedName}
            onChangeText={setEditedName}
          />
          <XStack gap="$2">
            <Button
              variant="outline"
              flex={1}
              onPress={() => setShowEditNameDialog(false)}
            >
              {t("shared.cancel")}
            </Button>
            <Button
              variant="primary"
              flex={1}
              onPress={() => {
                if (editingSignup && editedName.trim()) {
                  editPlayerNameMutation.mutate({
                    signupId: editingSignup.id,
                    playerName: editedName.trim(),
                  });
                }
              }}
              disabled={
                !editedName.trim() || editPlayerNameMutation.isPending
              }
            >
              {editPlayerNameMutation.isPending
                ? t("shared.saving")
                : t("shared.save")}
            </Button>
          </XStack>
        </YStack>
      </Dialog>

      {/* Remove Player Confirmation */}
      <AlertDialog
        open={showRemoveAlert}
        onOpenChange={setShowRemoveAlert}
        title={t("matchDetail.removePlayerTitle")}
        description={t("matchDetail.removePlayerMessage")}
        cancelText={t("shared.cancel")}
        confirmText={t("matchDetail.removePlayer")}
        onCancel={() => {
          setShowRemoveAlert(false);
          setSignupToRemove(null);
        }}
        onConfirm={confirmRemovePlayer}
        variant="destructive"
      />

      {/* Rules Modal */}
      <Dialog
        open={showRulesModal}
        onOpenChange={setShowRulesModal}
        title={t("rules.title")}
      >
        <ScrollView style={{ maxHeight: 400 }}>
          <YStack gap="$4" padding="$4">
            <YStack gap="$2">
              <Text fontSize="$5" fontWeight="600">
                {t("rules.generalTitle")}
              </Text>
              <List ordered bulletColor="$blue10">
                {(() => {
                  const generalRules = t("rules.general", {
                    returnObjects: true,
                  }) as string[];
                  return (
                    Array.isArray(generalRules) &&
                    generalRules.map((rule, index) => (
                      <List.Item key={index}>{rule}</List.Item>
                    ))
                  );
                })()}
              </List>
            </YStack>

            <YStack gap="$2">
              <Text fontSize="$5" fontWeight="600">
                {t("rules.matchTitle")}
              </Text>
              <List ordered bulletColor="$green10">
                {(() => {
                  const matchRules = t("rules.match", {
                    returnObjects: true,
                  }) as string[];
                  return (
                    Array.isArray(matchRules) &&
                    matchRules.map((rule, index) => (
                      <List.Item key={index}>{rule}</List.Item>
                    ))
                  );
                })()}
              </List>
            </YStack>

            <Button variant="outline" onPress={() => setShowRulesModal(false)}>
              {t("shared.close")}
            </Button>
          </YStack>
        </ScrollView>
      </Dialog>
    </Container>
  );
}
