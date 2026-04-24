import {
  useSession,
  useQuery,
  useMutation,
  useQueryClient,
  client,
  getAdminResetCodes,
  useCopyVenues,
  useCurrentGroup,
} from "@repo/api-client";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Button,
  Input,
  Select,
  Badge,
  Spinner,
  Dialog,
  AlertDialog,
  useToastController,
  isValidPhoneNumber,
} from "@repo/ui";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, RefreshControl } from "react-native";

type Tab = "matches" | "locations" | "courts" | "settings" | "voting";

interface Match {
  id: string;
  date: string;
  time: string;
  status: string;
  max_players: number;
  cost_per_player?: string;
  location_name?: string;
  court_name?: string;
}

interface Location {
  id: string;
  name: string;
  address?: string;
  coordinates?: string;
  courtCount?: number;
}

interface Court {
  id: string;
  name: string;
  description?: string;
  locationId: string;
  isActive: boolean;
}

// Extract the actual error message from API errors.
// The custom fetch in api-client throws Error("API error: 400 ...") with
// the real error details in error.data (e.g. { error: "Match not found" }).
const getApiErrorMessage = (error: Error): string => {
  const apiError = error as Error & {
    data?: { error?: string };
    status?: number;
  };
  if (
    apiError.data &&
    typeof apiError.data === "object" &&
    "error" in apiError.data
  ) {
    return (apiError.data as { error: string }).error;
  }
  return error.message;
};

// Helper to get localized error message
const getLocalizedError = (error: string, t: any): string => {
  // Map common API error patterns to translation keys
  const errorMap: Record<string, string> = {
    "A match already exists on this date": "errors.matchAlreadyExists",
    "Match not found": "errors.matchNotFound",
    "Location not found": "errors.locationNotFound",
    "Court not found": "errors.courtNotFound",
    "Voting criteria not found": "errors.votingCriteriaNotFound",
    "Failed to delete": "errors.deleteFailed",
    "Failed to update": "errors.updateFailed",
    "Failed to create": "errors.createFailed",
    "Only administrators can": "errors.adminOnly",
    Unauthorized: "errors.unauthorized",
  };

  // Check if error message matches any known pattern
  for (const [pattern, key] of Object.entries(errorMap)) {
    if (error.includes(pattern)) {
      return t(key);
    }
  }

  // If no match, check if error is already a translation key
  const translated = t(error, { defaultValue: "" });
  if (translated) return translated;

  // Fallback to original error
  return error;
};

export default function OrganizerScreen() {
  const { t } = useTranslation();
  const { data: session, isPending: isSessionPending } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("matches");

  const { myRole } = useCurrentGroup();
  const isPlatformAdmin = session?.user?.role === "admin";
  const canManage = isPlatformAdmin || myRole === "organizer";

  // Loading state
  if (isSessionPending) {
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

  // Auth check — organizer role in the active group OR platform admin.
  if (!session?.user || !canManage) {
    return (
      <Container variant="padded">
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color="$red10">{t("organizer.unauthorized")}</Text>
        </YStack>
      </Container>
    );
  }

  return (
    <Container variant="padded">
      <YStack flex={1} gap="$4">
        {/* Tab Selector - 2 rows to avoid truncation on mobile */}
        <YStack gap="$2">
          <XStack gap="$2">
            <Button
              flex={1}
              size="$3"
              variant={activeTab === "matches" ? "primary" : "outline"}
              onPress={() => setActiveTab("matches")}
              testID="admin-tab-matches"
            >
              {t("organizer.tabs.matches")}
            </Button>
            <Button
              flex={1}
              size="$3"
              variant={activeTab === "locations" ? "primary" : "outline"}
              onPress={() => setActiveTab("locations")}
              testID="admin-tab-locations"
            >
              {t("organizer.tabs.locations")}
            </Button>
            <Button
              flex={1}
              size="$3"
              variant={activeTab === "courts" ? "primary" : "outline"}
              onPress={() => setActiveTab("courts")}
              testID="admin-tab-courts"
            >
              {t("organizer.tabs.courts")}
            </Button>
          </XStack>
          <XStack gap="$2">
            <Button
              flex={1}
              size="$3"
              variant={activeTab === "voting" ? "primary" : "outline"}
              onPress={() => setActiveTab("voting")}
              testID="admin-tab-voting"
            >
              {t("voting.title")}
            </Button>
            <Button
              flex={1}
              size="$3"
              variant={activeTab === "settings" ? "primary" : "outline"}
              onPress={() => setActiveTab("settings")}
              testID="admin-tab-settings"
            >
              {t("settings.title")}
            </Button>
            <Button
              flex={1}
              size="$3"
              variant="outline"
              onPress={() => router.push("/(tabs)/admin/roster")}
              testID="admin-tab-roster"
            >
              {t("groups.roster.title")}
            </Button>
          </XStack>
        </YStack>

        {/* Tab Content */}
        {activeTab === "matches" && <MatchesTab />}
        {activeTab === "locations" && <LocationsTab />}
        {activeTab === "courts" && <CourtsTab />}
        {activeTab === "voting" && <VotingCriteriaTab />}
        {activeTab === "settings" && <SettingsTab />}
      </YStack>
    </Container>
  );
}

// ============ MATCHES TAB ============
function MatchesTab() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const toast = useToastController();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [targetMatch, setTargetMatch] = useState<Match | null>(null);

  const {
    data: matchesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["matches", "all"],
    queryFn: async () => {
      const res = await client.api.matches.$get({
        query: { type: "all", limit: "999" },
      });
      return res.json();
    },
  });

  const matches = (matchesData?.matches || []).sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateB.getTime() - dateA.getTime(); // Descending (newest first)
  });

  const deleteMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await client.api.matches[":id"].$delete({
        param: { id: matchId },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.show(t("organizer.deleteSuccess"), {
        duration: 3000,
        customData: { variant: "success" },
      });
    },
    onError: (error: Error) => {
      const message = getApiErrorMessage(error);
      const localizedMessage = getLocalizedError(message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await client.api.matches[":id"].$patch({
        param: { id: matchId },
        json: { status: "cancelled" },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.show(t("organizer.cancelSuccess"), {
        duration: 3000,
        customData: { variant: "success" },
      });
    },
    onError: (error: Error) => {
      const message = getApiErrorMessage(error);
      const localizedMessage = getLocalizedError(message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const handleDelete = (match: Match) => {
    setTargetMatch(match);
    setShowDeleteAlert(true);
  };

  const handleCancel = (match: Match) => {
    setTargetMatch(match);
    setShowCancelAlert(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "cancelled":
        return <Badge variant="destructive">{t("status.cancelled")}</Badge>;
      case "played":
        return <Badge variant="secondary">{t("status.played")}</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  return (
    <ScrollView
      backgroundColor="$background"
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <YStack gap="$3" paddingBottom="$6">
        {/* Add Match Button */}
        <Button
          variant="primary"
          onPress={() => router.push("/(tabs)/admin/add-match")}
          testID="admin-matches-add-btn"
        >
          {t("addMatch.title")}
        </Button>

        {/* Create Group — platform admin only */}
        {session?.user?.role === "admin" ? (
          <Button
            variant="outline"
            onPress={() => router.push("/(tabs)/admin/create-group")}
            testID="admin-groups-create-btn"
          >
            {t("groups.create.title")}
          </Button>
        ) : null}

        {/* Matches List */}
        {!matches || matches.length === 0 ? (
          <Card variant="outlined">
            <YStack padding="$4" alignItems="center" gap="$3">
              <Text color="$gray11">{t("organizer.noMatchesTitle")}</Text>
              <Text color="$gray10" fontSize="$3" textAlign="center">
                {t("organizer.noMatchesDescription")}
              </Text>
            </YStack>
          </Card>
        ) : (
          matches.map((match) => (
            <Card key={match.id} variant="elevated">
              <YStack padding="$3" gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$5" fontWeight="600">
                    {formatDate(match.date)}
                  </Text>
                  {getStatusBadge(match.status)}
                </XStack>

                <XStack gap="$3">
                  <Text color="$gray11">{match.time}</Text>
                  <Text color="$gray11">
                    {match.max_players} {t("players.title").toLowerCase()}
                  </Text>
                  {match.cost_per_player && (
                    <Text color="$gray11">{match.cost_per_player}</Text>
                  )}
                </XStack>

                {match.location_name && (
                  <Text fontSize="$3" color="$gray10">
                    {match.location_name}
                    {match.court_name && ` - ${match.court_name}`}
                  </Text>
                )}

                <YStack gap="$2" marginTop="$2">
                  <XStack gap="$2">
                    <Button
                      flex={1}
                      size="$3"
                      variant="outline"
                      onPress={() => router.push(`/(tabs)/matches/${match.id}`)}
                      testID={`admin-match-row-${match.id}-view`}
                    >
                      {t("organizer.viewMatch")}
                    </Button>
                    {match.status !== "cancelled" ? (
                      <Button
                        flex={1}
                        size="$3"
                        variant="outline"
                        onPress={() =>
                          router.push({
                            pathname: "/(tabs)/admin/edit-match",
                            params: { matchId: match.id },
                          })
                        }
                        testID={`admin-match-row-${match.id}-edit`}
                      >
                        {t("organizer.edit")}
                      </Button>
                    ) : (
                      <Button
                        flex={1}
                        size="$3"
                        variant="danger"
                        onPress={() => handleDelete(match)}
                        disabled={deleteMutation.isPending}
                        testID={`admin-match-row-${match.id}-delete`}
                      >
                        {t("organizer.delete")}
                      </Button>
                    )}
                  </XStack>
                  {match.status !== "cancelled" && (
                    <XStack gap="$2">
                      <Button
                        flex={1}
                        size="$3"
                        variant="outline"
                        onPress={() => handleCancel(match)}
                        disabled={cancelMutation.isPending}
                        testID={`admin-match-row-${match.id}-cancel`}
                      >
                        {t("organizer.cancelMatch")}
                      </Button>
                      <Button
                        flex={1}
                        size="$3"
                        variant="danger"
                        onPress={() => handleDelete(match)}
                        disabled={deleteMutation.isPending}
                        testID={`admin-match-row-${match.id}-delete`}
                      >
                        {t("organizer.delete")}
                      </Button>
                    </XStack>
                  )}
                </YStack>
              </YStack>
            </Card>
          ))
        )}
      </YStack>

      {/* Delete Match AlertDialog */}
      <AlertDialog
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        title={t("organizer.deleteTitle")}
        description={t("organizer.deleteMatchConfirm")}
        confirmText={t("organizer.deleteConfirm")}
        cancelText={t("shared.cancel")}
        variant="destructive"
        onConfirm={() => {
          if (targetMatch) {
            deleteMutation.mutate(targetMatch.id);
            setShowDeleteAlert(false);
          }
        }}
      />

      {/* Cancel Match AlertDialog */}
      <AlertDialog
        open={showCancelAlert}
        onOpenChange={setShowCancelAlert}
        title={t("organizer.cancelMatch")}
        description={
          targetMatch
            ? t("organizer.cancelMatchConfirm", {
                date: targetMatch.date,
                time: targetMatch.time,
              })
            : ""
        }
        confirmText={t("organizer.cancelMatch")}
        cancelText={t("shared.cancel")}
        variant="destructive"
        onConfirm={() => {
          if (targetMatch) {
            cancelMutation.mutate(targetMatch.id);
            setShowCancelAlert(false);
          }
        }}
      />
    </ScrollView>
  );
}

// ============ LOCATIONS TAB ============
function LocationsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToastController();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyFromGroupId, setCopyFromGroupId] = useState<string>("");

  const { groupId: currentGroupId, myGroups } = useCurrentGroup();
  const copyVenuesMutation = useCopyVenues();

  const copyableGroups = myGroups.filter(
    (g) => g.id !== currentGroupId && g.myRole === "organizer",
  );

  const {
    data: locations = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await client.api.locations.$get();
      return res.json() as Promise<Location[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.locations.$post({
        json: { name, address: address || undefined },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any).error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.show(t("locations.createSuccess"), {
        duration: 3000,
        customData: { variant: "success" },
      });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      const localizedMessage = getLocalizedError(error.message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingLocation) return;
      const res = await client.api.locations[":id"].$patch({
        param: { id: editingLocation.id },
        json: { name, address: address || undefined },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any).error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.show(t("locations.updateSuccess"), {
        duration: 3000,
        customData: { variant: "success" },
      });
      setEditingLocation(null);
      resetForm();
    },
    onError: (error: Error) => {
      const localizedMessage = getLocalizedError(error.message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const res = await client.api.locations[":id"].$delete({
        param: { id: locationId },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any).error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.show(t("locations.deleteSuccess"), {
        duration: 3000,
        customData: { variant: "success" },
      });
    },
    onError: (error: Error) => {
      const localizedMessage = getLocalizedError(error.message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const resetForm = () => {
    setName("");
    setAddress("");
  };

  const openEdit = (location: Location) => {
    setName(location.name);
    setAddress(location.address || "");
    setEditingLocation(location);
  };

  const handleDelete = (location: Location) => {
    setDeleteTarget(location);
    setShowDeleteAlert(true);
  };

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  return (
    <ScrollView
      backgroundColor="$background"
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <YStack gap="$3" paddingBottom="$6">
        {/* Add Location Button */}
        <Button
          variant="primary"
          onPress={() => setShowAddDialog(true)}
          testID="admin-locations-add-btn"
        >
          {t("locations.addLocation")}
        </Button>

        {copyableGroups.length > 0 ? (
          <Button
            variant="outline"
            onPress={() => {
              setCopyFromGroupId(copyableGroups[0]?.id ?? "");
              setShowCopyDialog(true);
            }}
            testID="admin-locations-copy-btn"
          >
            {t("locations.copyFromGroup")}
          </Button>
        ) : null}

        {/* Locations List */}
        {locations.length === 0 ? (
          <Card variant="outlined">
            <YStack padding="$4" alignItems="center">
              <Text color="$gray11">{t("locations.noLocations")}</Text>
            </YStack>
          </Card>
        ) : (
          locations.map((location) => (
            <Card key={location.id} variant="elevated">
              <YStack padding="$3" gap="$2">
                <Text fontSize="$5" fontWeight="600">
                  {location.name}
                </Text>
                {location.address && (
                  <Text color="$gray11">{location.address}</Text>
                )}
                <XStack gap="$2" marginTop="$2">
                  <Button
                    flex={1}
                    size="$3"
                    variant="outline"
                    onPress={() => openEdit(location)}
                    testID={`admin-location-row-${location.id}-edit`}
                  >
                    {t("organizer.edit")}
                  </Button>
                  <Button
                    size="$3"
                    variant="danger"
                    onPress={() => handleDelete(location)}
                    disabled={deleteMutation.isPending}
                    testID={`admin-location-row-${location.id}-delete`}
                  >
                    {t("locations.delete")}
                  </Button>
                </XStack>
              </YStack>
            </Card>
          ))
        )}

        {/* Add Location Dialog */}
        <Dialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          title={t("locations.addLocation")}
          onConfirm={() => createMutation.mutate()}
          onCancel={() => {
            setShowAddDialog(false);
            resetForm();
          }}
          confirmText={
            createMutation.isPending
              ? t("locations.creating")
              : t("locations.create")
          }
          cancelText={t("shared.cancel")}
        >
          <YStack gap="$4" padding="$4">
            <Input
              label={t("locations.name")}
              placeholder={t("locations.namePlaceholder")}
              value={name}
              onChangeText={setName}
            />
            <Input
              label={t("locations.address")}
              placeholder={t("locations.addressPlaceholder")}
              value={address}
              onChangeText={setAddress}
            />
          </YStack>
        </Dialog>

        {/* Edit Location Dialog */}
        <Dialog
          open={!!editingLocation}
          onOpenChange={() => {
            setEditingLocation(null);
            resetForm();
          }}
          title={t("locations.editLocation")}
          onConfirm={() => updateMutation.mutate()}
          onCancel={() => {
            setEditingLocation(null);
            resetForm();
          }}
          confirmText={
            updateMutation.isPending
              ? t("locations.updating")
              : t("locations.update")
          }
          cancelText={t("shared.cancel")}
        >
          <YStack gap="$4" padding="$4">
            <Input
              label={t("locations.name")}
              placeholder={t("locations.namePlaceholder")}
              value={name}
              onChangeText={setName}
            />
            <Input
              label={t("locations.address")}
              placeholder={t("locations.addressPlaceholder")}
              value={address}
              onChangeText={setAddress}
            />
          </YStack>
        </Dialog>

        {/* Delete Location AlertDialog */}
        <AlertDialog
          open={showDeleteAlert}
          onOpenChange={setShowDeleteAlert}
          title={t("shared.confirmDelete")}
          description={t("shared.deleteConfirm")}
          confirmText={t("shared.delete")}
          cancelText={t("shared.cancel")}
          variant="destructive"
          onConfirm={() => {
            if (deleteTarget) {
              deleteMutation.mutate(deleteTarget.id);
              setShowDeleteAlert(false);
            }
          }}
        />

        <Dialog
          open={showCopyDialog}
          onOpenChange={setShowCopyDialog}
          title={t("locations.copyFromGroup")}
          onConfirm={() => {
            if (!copyFromGroupId || copyVenuesMutation.isPending) return;
            copyVenuesMutation.mutate(copyFromGroupId, {
              onSuccess: (data) => {
                setShowCopyDialog(false);
                toast.show(
                  t("locations.copySuccess", {
                    locations: data.locationsCopied,
                    courts: data.courtsCopied,
                  }),
                  { duration: 4000, customData: { variant: "success" } },
                );
              },
              onError: (error: Error) => {
                toast.show(getLocalizedError(error.message, t), {
                  duration: 4000,
                  customData: { variant: "error" },
                });
              },
            });
          }}
          onCancel={() => setShowCopyDialog(false)}
          confirmText={
            copyVenuesMutation.isPending
              ? t("locations.copying")
              : t("locations.copy")
          }
          cancelText={t("shared.cancel")}
        >
          <YStack gap="$3" padding="$4">
            <Text color="$gray11">{t("locations.copyFromGroupHint")}</Text>
            <Select
              value={copyFromGroupId}
              onValueChange={setCopyFromGroupId}
              label={t("locations.sourceGroup")}
              placeholder={t("locations.selectSourceGroup")}
              options={copyableGroups.map((g) => ({
                label: g.name,
                value: g.id,
              }))}
            />
          </YStack>
        </Dialog>
      </YStack>
    </ScrollView>
  );
}

// ============ COURTS TAB ============
function CourtsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToastController();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Court | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState("");

  // Fetch locations for dropdown
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await client.api.locations.$get();
      return res.json() as Promise<Location[]>;
    },
  });

  const {
    data: courts = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["courts"],
    queryFn: async () => {
      const res = await client.api.courts.$get({ query: {} });
      return res.json() as Promise<Court[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await client.api.courts.$post({
        json: {
          name,
          locationId,
          description: description || undefined,
          isActive: true,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any).error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      toast.show(t("courts.createSuccess"), { duration: 3000 });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      const localizedMessage = getLocalizedError(error.message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingCourt) return;
      const res = await client.api.courts[":id"].$patch({
        param: { id: editingCourt.id },
        json: {
          name,
          description: description || undefined,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any).error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      toast.show(t("courts.updateSuccess"), {
        duration: 3000,
        customData: { variant: "success" },
      });
      setEditingCourt(null);
      resetForm();
    },
    onError: (error: Error) => {
      const localizedMessage = getLocalizedError(error.message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courtId: string) => {
      const res = await client.api.courts[":id"].$delete({
        param: { id: courtId },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any).error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      toast.show(t("courts.deleteSuccess"), {
        duration: 3000,
        customData: { variant: "success" },
      });
    },
    onError: (error: Error) => {
      const localizedMessage = getLocalizedError(error.message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setLocationId("");
  };

  const openEdit = (court: Court) => {
    setName(court.name);
    setDescription(court.description || "");
    setLocationId(court.locationId);
    setEditingCourt(court);
  };

  const handleDelete = (court: Court) => {
    setDeleteTarget(court);
    setShowDeleteAlert(true);
  };

  const getLocationName = (locId: string) => {
    return (
      locations.find((l) => l.id === locId)?.name || t("courts.unknownLocation")
    );
  };

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: loc.name,
  }));

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  return (
    <ScrollView
      backgroundColor="$background"
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <YStack gap="$3" paddingBottom="$6">
        {/* Add Court Button */}
        <Button
          variant="primary"
          onPress={() => setShowAddDialog(true)}
          testID="admin-courts-add-btn"
        >
          {t("courts.addCourt")}
        </Button>

        {/* Courts List */}
        {courts.length === 0 ? (
          <Card variant="outlined">
            <YStack padding="$4" alignItems="center">
              <Text color="$gray11">{t("courts.noCourts")}</Text>
            </YStack>
          </Card>
        ) : (
          courts.map((court) => (
            <Card key={court.id} variant="elevated">
              <YStack padding="$3" gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$5" fontWeight="600">
                    {court.name}
                  </Text>
                  {!court.isActive && (
                    <Badge variant="secondary">{t("status.inactive")}</Badge>
                  )}
                </XStack>
                <Text color="$gray11">{getLocationName(court.locationId)}</Text>
                {court.description && (
                  <Text fontSize="$3" color="$gray10">
                    {court.description}
                  </Text>
                )}
                <XStack gap="$2" marginTop="$2">
                  <Button
                    flex={1}
                    size="$3"
                    variant="outline"
                    onPress={() => openEdit(court)}
                    testID={`admin-court-row-${court.id}-edit`}
                  >
                    {t("courts.edit")}
                  </Button>
                  <Button
                    size="$3"
                    variant="danger"
                    onPress={() => handleDelete(court)}
                    disabled={deleteMutation.isPending}
                    testID={`admin-court-row-${court.id}-delete`}
                  >
                    {t("courts.delete")}
                  </Button>
                </XStack>
              </YStack>
            </Card>
          ))
        )}

        {/* Add Court Dialog */}
        <Dialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          title={t("courts.createTitle")}
          onConfirm={() => createMutation.mutate()}
          onCancel={() => {
            setShowAddDialog(false);
            resetForm();
          }}
          confirmText={
            createMutation.isPending ? t("courts.creating") : t("courts.create")
          }
          cancelText={t("courts.cancel")}
        >
          <YStack gap="$4" padding="$4">
            <Select
              value={locationId}
              onValueChange={setLocationId}
              label={t("courts.location")}
              placeholder={t("courts.selectLocation")}
              options={locationOptions}
            />
            <Input
              label={t("courts.courtName")}
              placeholder={t("courts.courtNamePlaceholder")}
              value={name}
              onChangeText={setName}
            />
            <Input
              label={t("courts.description")}
              placeholder={t("courts.descriptionPlaceholder")}
              value={description}
              onChangeText={setDescription}
            />
          </YStack>
        </Dialog>

        {/* Edit Court Dialog */}
        <Dialog
          open={!!editingCourt}
          onOpenChange={() => {
            setEditingCourt(null);
            resetForm();
          }}
          title={t("courts.editTitle")}
          onConfirm={() => updateMutation.mutate()}
          onCancel={() => {
            setEditingCourt(null);
            resetForm();
          }}
          confirmText={
            updateMutation.isPending ? t("courts.updating") : t("courts.update")
          }
          cancelText={t("courts.cancel")}
        >
          <YStack gap="$4" padding="$4">
            <Input
              label={t("courts.courtName")}
              placeholder={t("courts.courtNamePlaceholder")}
              value={name}
              onChangeText={setName}
            />
            <Input
              label={t("courts.description")}
              placeholder={t("courts.descriptionPlaceholder")}
              value={description}
              onChangeText={setDescription}
            />
          </YStack>
        </Dialog>

        {/* Delete Court AlertDialog */}
        <AlertDialog
          open={showDeleteAlert}
          onOpenChange={setShowDeleteAlert}
          title={t("courts.deleteConfirm")}
          description=""
          confirmText={t("courts.delete")}
          cancelText={t("shared.cancel")}
          variant="destructive"
          onConfirm={() => {
            if (deleteTarget) {
              deleteMutation.mutate(deleteTarget.id);
              setShowDeleteAlert(false);
            }
          }}
        />
      </YStack>
    </ScrollView>
  );
}

// ============ SETTINGS TAB ============
// Validation helper functions
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const isValidNumeric = (value: string): boolean => {
  return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
};

interface AppSettings {
  default_cost_per_player: string;
  same_day_extra_cost: string;
  default_max_substitutes: string;
  paypal_url: string;
  organizer_whatsapp: string;
}

function SettingsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToastController();

  const [defaultCostPerPlayerOverride, setDefaultCostPerPlayerOverride] =
    useState<string | null>(null);
  const [sameDayExtraCostOverride, setSameDayExtraCostOverride] = useState<
    string | null
  >(null);
  const [defaultMaxSubstitutesOverride, setDefaultMaxSubstitutesOverride] =
    useState<string | null>(null);
  const [paypalUrlOverride, setPaypalUrlOverride] = useState<string | null>(
    null,
  );
  const [organizerWhatsappOverride, setOrganizerWhatsappOverride] = useState<
    string | null
  >(null);

  const {
    data: settings,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await client.api.settings.$get();
      return res.json() as Promise<AppSettings>;
    },
  });

  const defaultCostPerPlayer =
    defaultCostPerPlayerOverride ?? settings?.default_cost_per_player ?? "";
  const sameDayExtraCost =
    sameDayExtraCostOverride ?? settings?.same_day_extra_cost ?? "";
  const defaultMaxSubstitutes =
    defaultMaxSubstitutesOverride ?? settings?.default_max_substitutes ?? "";
  const paypalUrl = paypalUrlOverride ?? settings?.paypal_url ?? "";
  const organizerWhatsapp =
    organizerWhatsappOverride ?? settings?.organizer_whatsapp ?? "";

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<AppSettings>) => {
      const res = await client.api.settings.$patch({
        json: updates,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any).error || "Failed to update settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.show(t("settings.saveSuccess"), {
        duration: 3000,
        customData: { variant: "success" },
      });
    },
    onError: (error: Error) => {
      const localizedMessage = getLocalizedError(error.message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const handleSave = () => {
    // Validate numeric fields
    if (defaultCostPerPlayer && !isValidNumeric(defaultCostPerPlayer)) {
      toast.show(t("settings.invalidCost"), {
        duration: 3000,
        customData: { variant: "error" },
      });
      return;
    }
    if (sameDayExtraCost && !isValidNumeric(sameDayExtraCost)) {
      toast.show(t("settings.invalidCost"), {
        duration: 3000,
        customData: { variant: "error" },
      });
      return;
    }
    if (defaultMaxSubstitutes && !isValidNumeric(defaultMaxSubstitutes)) {
      toast.show(t("settings.invalidCost"), {
        duration: 3000,
        customData: { variant: "error" },
      });
      return;
    }

    // Validate URL
    if (paypalUrl && !isValidUrl(paypalUrl)) {
      toast.show(t("settings.invalidUrl"), {
        duration: 3000,
        customData: { variant: "error" },
      });
      return;
    }

    // Validate phone
    if (organizerWhatsapp && !isValidPhoneNumber(organizerWhatsapp)) {
      toast.show(t("settings.invalidPhone"), {
        duration: 3000,
        customData: { variant: "error" },
      });
      return;
    }

    updateMutation.mutate({
      default_cost_per_player: defaultCostPerPlayer,
      same_day_extra_cost: sameDayExtraCost,
      default_max_substitutes: defaultMaxSubstitutes,
      paypal_url: paypalUrl,
      organizer_whatsapp: organizerWhatsapp,
    });
  };

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  return (
    <ScrollView
      backgroundColor="$background"
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <YStack gap="$3" paddingBottom="$6">
        {/* Cost Settings */}
        <Card variant="elevated">
          <YStack padding="$4" gap="$4">
            <Text fontSize="$5" fontWeight="600">
              {t("settings.costs")}
            </Text>

            <Input
              label={t("settings.defaultCostPerPlayer")}
              placeholder="10"
              value={defaultCostPerPlayer}
              onChangeText={setDefaultCostPerPlayerOverride}
              keyboardType="numeric"
            />

            <Input
              label={t("settings.sameDayExtraCost")}
              placeholder="2"
              value={sameDayExtraCost}
              onChangeText={setSameDayExtraCostOverride}
              keyboardType="numeric"
            />

            <Input
              label={t("settings.defaultMaxSubstitutes")}
              placeholder="2"
              value={defaultMaxSubstitutes}
              onChangeText={setDefaultMaxSubstitutesOverride}
              keyboardType="numeric"
            />
          </YStack>
        </Card>

        {/* Payment Settings */}
        <Card variant="elevated">
          <YStack padding="$4" gap="$4">
            <Text fontSize="$5" fontWeight="600">
              {t("matchDetail.paymentInfo")}
            </Text>

            <Input
              label={t("settings.paypalUrl")}
              placeholder="https://paypal.me/..."
              value={paypalUrl}
              onChangeText={setPaypalUrlOverride}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Input
              label={t("settings.organizerWhatsapp")}
              placeholder="+1234567890"
              value={organizerWhatsapp}
              onChangeText={setOrganizerWhatsappOverride}
              keyboardType="phone-pad"
            />
          </YStack>
        </Card>

        {/* Save Button */}
        <Button
          variant="primary"
          onPress={handleSave}
          disabled={updateMutation.isPending}
          testID="admin-settings-save-btn"
        >
          {updateMutation.isPending ? t("shared.loading") : t("shared.save")}
        </Button>

        {/* Password Reset Codes */}
        <ResetCodesSection />
      </YStack>
    </ScrollView>
  );
}

function ResetCodesSection() {
  const { t } = useTranslation();
  const { data: codes, isLoading, refetch } = useQuery({
    queryKey: ["admin-reset-codes"],
    queryFn: getAdminResetCodes,
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  return (
    <Card variant="elevated">
      <YStack padding="$4" gap="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$5" fontWeight="600">
            {t("admin.resetCodes", { defaultValue: "Password Reset Codes" })}
          </Text>
          <Button size="$2" variant="outline" onPress={() => refetch()}>
            {isLoading ? <Spinner size="small" /> : t("shared.refresh", { defaultValue: "Refresh" })}
          </Button>
        </XStack>

        {!codes || codes.length === 0 ? (
          <Text color="$gray11" fontSize="$3">
            {t("admin.noResetCodes", { defaultValue: "No pending reset codes" })}
          </Text>
        ) : (
          codes.map((item) => (
            <Card key={item.identifier} variant="elevated" padding="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <YStack gap="$1">
                  <Text fontSize="$3" fontWeight="600">
                    {item.identifier}
                  </Text>
                  <Text fontSize="$2" color="$gray11">
                    {t("admin.expiresAt", { defaultValue: "Expires" })}:{" "}
                    {new Date(item.expiresAt).toLocaleTimeString()}
                  </Text>
                </YStack>
                <Text
                  fontSize="$7"
                  fontWeight="bold"
                  fontFamily="$mono"
                  letterSpacing={2}
                >
                  {item.code}
                </Text>
              </XStack>
            </Card>
          ))
        )}
      </YStack>
    </Card>
  );
}

// ============ VOTING CRITERIA TAB ============
interface VotingCriteria {
  id: string;
  code: string;
  name: string; // Localized name from API
  description?: string; // Localized description from API
  nameEn: string;
  nameEs: string;
  descriptionEn?: string;
  descriptionEs?: string;
  isActive: boolean;
  sortOrder: number;
}

function VotingCriteriaTab() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToastController();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<VotingCriteria | null>(
    null,
  );
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VotingCriteria | null>(null);
  const [code, setCode] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameEs, setNameEs] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionEs, setDescriptionEs] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const language = i18n.language === "es" ? "es" : "en";

  const {
    data: criteriaData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["voting-criteria-all"],
    queryFn: async () => {
      const res = await client.api.voting.criteria.all.$get();
      return res.json() as Promise<{ criteria: VotingCriteria[] }>;
    },
  });

  const criteria = criteriaData?.criteria || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const order = parseInt(sortOrder, 10) || 0;

      // Check for duplicate sort order
      const existingWithOrder = criteria.find((c) => c.sortOrder === order);
      if (existingWithOrder) {
        throw new Error(t("voting.duplicateSortOrder"));
      }

      const res = await client.api.voting.criteria.$post({
        json: {
          code,
          nameEn,
          nameEs,
          descriptionEn: descriptionEn || undefined,
          descriptionEs: descriptionEs || undefined,
          sortOrder: order,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error((error as any).error || "Failed to create criteria");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voting-criteria-all"] });
      toast.show(t("voting.createSuccess"), {
        duration: 3000,
        customData: { variant: "success" },
      });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      const localizedMessage = getLocalizedError(error.message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingCriteria) return;

      const order = parseInt(sortOrder, 10) || 0;

      // Check for duplicate sort order (excluding current criteria)
      const existingWithOrder = criteria.find(
        (c) => c.sortOrder === order && c.id !== editingCriteria.id,
      );
      if (existingWithOrder) {
        throw new Error(t("voting.duplicateSortOrder"));
      }

      const res = await client.api.voting.criteria[":id"].$patch({
        param: { id: editingCriteria.id },
        json: {
          code,
          nameEn,
          nameEs,
          descriptionEn: descriptionEn || undefined,
          descriptionEs: descriptionEs || undefined,
          sortOrder: order,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error((error as any).error || "Failed to update criteria");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voting-criteria-all"] });
      toast.show(t("voting.updateSuccess"), {
        duration: 3000,
        customData: { variant: "success" },
      });
      setEditingCriteria(null);
      resetForm();
    },
    onError: (error: Error) => {
      const localizedMessage = getLocalizedError(error.message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await client.api.voting.criteria[":id"].$patch({
        param: { id },
        json: { isActive },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          (data as any).error || "Failed to toggle active status",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voting-criteria-all"] });
    },
    onError: (error: Error) => {
      const localizedMessage = getLocalizedError(error.message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (criteriaId: string) => {
      const res = await client.api.voting.criteria[":id"].$delete({
        param: { id: criteriaId },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any).error || "Failed to delete criteria");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voting-criteria-all"] });
      toast.show(t("voting.deleteSuccess"), {
        duration: 3000,
        customData: { variant: "success" },
      });
    },
    onError: (error: Error) => {
      const localizedMessage = getLocalizedError(error.message, t);
      toast.show(localizedMessage, {
        duration: 4000,
        customData: { variant: "error" },
      });
    },
  });

  const resetForm = () => {
    setCode("");
    setNameEn("");
    setNameEs("");
    setDescriptionEn("");
    setDescriptionEs("");
    setSortOrder("0");
  };

  const openEdit = (c: VotingCriteria) => {
    setCode(c.code);
    setNameEn(c.nameEn);
    setNameEs(c.nameEs);
    setDescriptionEn(c.descriptionEn || "");
    setDescriptionEs(c.descriptionEs || "");
    setSortOrder(String(c.sortOrder));
    setEditingCriteria(c);
  };

  const handleDelete = (c: VotingCriteria) => {
    setDeleteTarget(c);
    setShowDeleteAlert(true);
  };

  const getName = (c: VotingCriteria) =>
    language === "es" ? c.nameEs : c.nameEn;
  const getDescription = (c: VotingCriteria) =>
    language === "es" ? c.descriptionEs : c.descriptionEn;

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  return (
    <ScrollView
      backgroundColor="$background"
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <YStack gap="$3" paddingBottom="$6">
        {/* Add Criteria Button */}
        <Button
          variant="primary"
          onPress={() => setShowAddDialog(true)}
          testID="admin-voting-add-btn"
        >
          {t("admin.addCriteria")}
        </Button>

        {/* Criteria List */}
        {criteria.length === 0 ? (
          <Card variant="outlined">
            <YStack padding="$4" alignItems="center">
              <Text color="$gray11">{t("admin.noCriteria")}</Text>
            </YStack>
          </Card>
        ) : (
          criteria.map((c) => (
            <Card key={c.id} variant="elevated">
              <YStack padding="$3" gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$5" fontWeight="600">
                    {getName(c)}
                  </Text>
                  <XStack alignItems="center" gap="$2">
                    <Badge variant={c.isActive ? "default" : "secondary"}>
                      {c.isActive ? t("status.active") : t("status.inactive")}
                    </Badge>
                    <Text color="$gray10" fontSize="$2">
                      #{c.sortOrder}
                    </Text>
                  </XStack>
                </XStack>

                {getDescription(c) && (
                  <Text color="$gray11" fontStyle="italic">
                    {getDescription(c)}
                  </Text>
                )}

                <Text color="$gray10" fontSize="$2">
                  Code: {c.code}
                </Text>

                <XStack gap="$2" marginTop="$2" flexWrap="wrap">
                  <Button
                    size="$3"
                    variant="outline"
                    onPress={() =>
                      toggleActiveMutation.mutate({
                        id: c.id,
                        isActive: !c.isActive,
                      })
                    }
                    disabled={toggleActiveMutation.isPending}
                    testID={`admin-voting-row-${c.id}-toggle`}
                  >
                    {c.isActive ? t("admin.deactivate") : t("admin.activate")}
                  </Button>
                  <Button
                    size="$3"
                    variant="outline"
                    onPress={() => openEdit(c)}
                    testID={`admin-voting-row-${c.id}-edit`}
                  >
                    {t("organizer.edit")}
                  </Button>
                  <Button
                    size="$3"
                    variant="danger"
                    onPress={() => handleDelete(c)}
                    disabled={deleteMutation.isPending}
                    testID={`admin-voting-row-${c.id}-delete`}
                  >
                    {t("shared.delete")}
                  </Button>
                </XStack>
              </YStack>
            </Card>
          ))
        )}

        {/* Add Criteria Dialog */}
        <Dialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          title={t("admin.addCriteria")}
          onConfirm={() => createMutation.mutate()}
          onCancel={() => {
            setShowAddDialog(false);
            resetForm();
          }}
          confirmText={
            createMutation.isPending ? t("shared.loading") : t("shared.save")
          }
          cancelText={t("shared.cancel")}
        >
          <YStack gap="$4" padding="$4">
            <Input
              label={t("admin.criteriaCode")}
              placeholder="e.g., el_abeja"
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
            />
            <Input
              label={t("admin.nameEnglish")}
              placeholder="The Bee"
              value={nameEn}
              onChangeText={setNameEn}
            />
            <Input
              label={t("admin.nameSpanish")}
              placeholder="El Abeja"
              value={nameEs}
              onChangeText={setNameEs}
            />
            <Input
              label={t("admin.descriptionEnglish")}
              placeholder="One sprint and dies"
              value={descriptionEn}
              onChangeText={setDescriptionEn}
            />
            <Input
              label={t("admin.descriptionSpanish")}
              placeholder="Un pique y se muere"
              value={descriptionEs}
              onChangeText={setDescriptionEs}
            />
            <Input
              label={t("admin.sortOrder")}
              placeholder="0"
              value={sortOrder}
              onChangeText={setSortOrder}
              keyboardType="numeric"
            />
          </YStack>
        </Dialog>

        {/* Edit Criteria Dialog */}
        <Dialog
          open={!!editingCriteria}
          onOpenChange={() => {
            setEditingCriteria(null);
            resetForm();
          }}
          title={t("admin.editCriteria")}
          onConfirm={() => updateMutation.mutate()}
          onCancel={() => {
            setEditingCriteria(null);
            resetForm();
          }}
          confirmText={
            updateMutation.isPending ? t("shared.loading") : t("shared.save")
          }
          cancelText={t("shared.cancel")}
        >
          <YStack gap="$4" padding="$4">
            <Input
              label={t("admin.criteriaCode")}
              placeholder="e.g., el_abeja"
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
            />
            <Input
              label={t("admin.nameEnglish")}
              placeholder="The Bee"
              value={nameEn}
              onChangeText={setNameEn}
            />
            <Input
              label={t("admin.nameSpanish")}
              placeholder="El Abeja"
              value={nameEs}
              onChangeText={setNameEs}
            />
            <Input
              label={t("admin.descriptionEnglish")}
              placeholder="One sprint and dies"
              value={descriptionEn}
              onChangeText={setDescriptionEn}
            />
            <Input
              label={t("admin.descriptionSpanish")}
              placeholder="Un pique y se muere"
              value={descriptionEs}
              onChangeText={setDescriptionEs}
            />
            <Input
              label={t("admin.sortOrder")}
              placeholder="0"
              value={sortOrder}
              onChangeText={setSortOrder}
              keyboardType="numeric"
            />
          </YStack>
        </Dialog>

        {/* Delete Voting Criteria AlertDialog */}
        <AlertDialog
          open={showDeleteAlert}
          onOpenChange={setShowDeleteAlert}
          title={t("shared.confirmDelete")}
          description={t("shared.deleteConfirm")}
          confirmText={t("shared.delete")}
          cancelText={t("shared.cancel")}
          variant="destructive"
          onConfirm={() => {
            if (deleteTarget) {
              deleteMutation.mutate(deleteTarget.id);
              setShowDeleteAlert(false);
            }
          }}
        />
      </YStack>
    </ScrollView>
  );
}
