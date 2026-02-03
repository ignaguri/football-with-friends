import {
  useSession,
  useQuery,
  useMutation,
  useQueryClient,
  client,
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
} from "@repo/ui";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, RefreshControl, Alert } from "react-native";

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

export default function OrganizerScreen() {
  const { t } = useTranslation();
  const { data: session, isPending: isSessionPending } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("matches");

  const isAdmin = session?.user?.role === "admin";

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

  // Auth check
  if (!session?.user || !isAdmin) {
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
        {/* Tab Selector */}
        <XStack gap="$2">
          <Button
            flex={1}
            size="$3"
            variant={activeTab === "matches" ? "primary" : "outline"}
            onPress={() => setActiveTab("matches")}
          >
            {t("organizer.tabs.matches")}
          </Button>
          <Button
            flex={1}
            size="$3"
            variant={activeTab === "locations" ? "primary" : "outline"}
            onPress={() => setActiveTab("locations")}
          >
            {t("organizer.tabs.locations")}
          </Button>
          <Button
            flex={1}
            size="$3"
            variant={activeTab === "courts" ? "primary" : "outline"}
            onPress={() => setActiveTab("courts")}
          >
            {t("organizer.tabs.courts")}
          </Button>
          <Button
            flex={1}
            size="$3"
            variant={activeTab === "settings" ? "primary" : "outline"}
            onPress={() => setActiveTab("settings")}
          >
            {t("settings.title")}
          </Button>
          <Button
            flex={1}
            size="$3"
            variant={activeTab === "voting" ? "primary" : "outline"}
            onPress={() => setActiveTab("voting")}
          >
            {t("voting.title")}
          </Button>
        </XStack>

        {/* Tab Content */}
        {activeTab === "matches" && <MatchesTab />}
        {activeTab === "locations" && <LocationsTab />}
        {activeTab === "courts" && <CourtsTab />}
        {activeTab === "settings" && <SettingsTab />}
        {activeTab === "voting" && <VotingCriteriaTab />}
      </YStack>
    </Container>
  );
}

// ============ MATCHES TAB ============
function MatchesTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

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

  const matches = matchesData?.matches || [];

  const deleteMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await client.api.matches[":id"].$delete({
        param: { id: matchId },
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      Alert.alert(t("organizer.deleteSuccess"));
    },
    onError: () => {
      Alert.alert(t("organizer.deleteError"));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await client.api.matches[":id"].$patch({
        param: { id: matchId },
        json: { status: "cancelled" },
      });
      if (!res.ok) throw new Error("Failed to cancel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      Alert.alert(t("organizer.matchCancelledSuccess"));
    },
  });

  const handleDelete = (match: Match) => {
    Alert.alert(t("organizer.deleteTitle"), t("organizer.deleteMatchConfirm"), [
      { text: t("shared.cancel"), style: "cancel" },
      {
        text: t("organizer.deleteConfirm"),
        style: "destructive",
        onPress: () => deleteMutation.mutate(match.id),
      },
    ]);
  };

  const handleCancel = (match: Match) => {
    Alert.alert(
      t("organizer.cancelMatch"),
      t("organizer.cancelMatchConfirm", { date: match.date, time: match.time }),
      [
        { text: t("shared.cancel"), style: "cancel" },
        {
          text: t("organizer.cancelMatch"),
          style: "destructive",
          onPress: () => cancelMutation.mutate(match.id),
        },
      ],
    );
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
        >
          {t("addMatch.title")}
        </Button>

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

                <XStack gap="$2" marginTop="$2">
                  <Button
                    flex={1}
                    size="$3"
                    variant="outline"
                    onPress={() => router.push(`/(tabs)/matches/${match.id}`)}
                  >
                    {t("organizer.viewMatch")}
                  </Button>
                  {match.status !== "cancelled" && (
                    <Button
                      flex={1}
                      size="$3"
                      variant="outline"
                      onPress={() => handleCancel(match)}
                      disabled={cancelMutation.isPending}
                    >
                      {t("organizer.cancelMatch")}
                    </Button>
                  )}
                  <Button
                    size="$3"
                    variant="danger"
                    onPress={() => handleDelete(match)}
                    disabled={deleteMutation.isPending}
                  >
                    {t("organizer.delete")}
                  </Button>
                </XStack>
              </YStack>
            </Card>
          ))
        )}
      </YStack>
    </ScrollView>
  );
}

// ============ LOCATIONS TAB ============
function LocationsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

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
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      Alert.alert(t("locations.createSuccess"));
      setShowAddDialog(false);
      resetForm();
    },
    onError: () => Alert.alert(t("locations.createError")),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingLocation) return;
      const res = await client.api.locations[":id"].$patch({
        param: { id: editingLocation.id },
        json: { name, address: address || undefined },
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      Alert.alert(t("locations.updateSuccess"));
      setEditingLocation(null);
      resetForm();
    },
    onError: () => Alert.alert(t("locations.updateError")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const res = await client.api.locations[":id"].$delete({
        param: { id: locationId },
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      Alert.alert(t("locations.deleteSuccess"));
    },
    onError: () => Alert.alert(t("locations.deleteError")),
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
    Alert.alert(t("shared.confirmDelete"), t("shared.deleteConfirm"), [
      { text: t("shared.cancel"), style: "cancel" },
      {
        text: t("shared.delete"),
        style: "destructive",
        onPress: () => deleteMutation.mutate(location.id),
      },
    ]);
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
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <YStack gap="$3" paddingBottom="$6">
        {/* Add Location Button */}
        <Button variant="primary" onPress={() => setShowAddDialog(true)}>
          {t("locations.addLocation")}
        </Button>

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
                  >
                    {t("organizer.edit")}
                  </Button>
                  <Button
                    size="$3"
                    variant="danger"
                    onPress={() => handleDelete(location)}
                    disabled={deleteMutation.isPending}
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
            <XStack gap="$2">
              <Button
                flex={1}
                variant="outline"
                onPress={() => {
                  setShowAddDialog(false);
                  resetForm();
                }}
              >
                {t("shared.cancel")}
              </Button>
              <Button
                flex={1}
                variant="primary"
                onPress={() => createMutation.mutate()}
                disabled={!name || createMutation.isPending}
              >
                {createMutation.isPending
                  ? t("locations.creating")
                  : t("locations.create")}
              </Button>
            </XStack>
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
            <XStack gap="$2">
              <Button
                flex={1}
                variant="outline"
                onPress={() => {
                  setEditingLocation(null);
                  resetForm();
                }}
              >
                {t("shared.cancel")}
              </Button>
              <Button
                flex={1}
                variant="primary"
                onPress={() => updateMutation.mutate()}
                disabled={!name || updateMutation.isPending}
              >
                {updateMutation.isPending
                  ? t("locations.updating")
                  : t("locations.update")}
              </Button>
            </XStack>
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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
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
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      Alert.alert(t("courts.createSuccess"));
      setShowAddDialog(false);
      resetForm();
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
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      Alert.alert(t("courts.updateSuccess"));
      setEditingCourt(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courtId: string) => {
      const res = await client.api.courts[":id"].$delete({
        param: { id: courtId },
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      Alert.alert(t("courts.deleteSuccess"));
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
    Alert.alert(t("courts.deleteConfirm"), "", [
      { text: t("shared.cancel"), style: "cancel" },
      {
        text: t("courts.delete"),
        style: "destructive",
        onPress: () => deleteMutation.mutate(court.id),
      },
    ]);
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
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <YStack gap="$3" paddingBottom="$6">
        {/* Add Court Button */}
        <Button variant="primary" onPress={() => setShowAddDialog(true)}>
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
                  >
                    {t("courts.edit")}
                  </Button>
                  <Button
                    size="$3"
                    variant="danger"
                    onPress={() => handleDelete(court)}
                    disabled={deleteMutation.isPending}
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
            <XStack gap="$2">
              <Button
                flex={1}
                variant="outline"
                onPress={() => {
                  setShowAddDialog(false);
                  resetForm();
                }}
              >
                {t("courts.cancel")}
              </Button>
              <Button
                flex={1}
                variant="primary"
                onPress={() => createMutation.mutate()}
                disabled={!name || !locationId || createMutation.isPending}
              >
                {createMutation.isPending
                  ? t("courts.creating")
                  : t("courts.create")}
              </Button>
            </XStack>
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
            <XStack gap="$2">
              <Button
                flex={1}
                variant="outline"
                onPress={() => {
                  setEditingCourt(null);
                  resetForm();
                }}
              >
                {t("courts.cancel")}
              </Button>
              <Button
                flex={1}
                variant="primary"
                onPress={() => updateMutation.mutate()}
                disabled={!name || updateMutation.isPending}
              >
                {updateMutation.isPending
                  ? t("courts.updating")
                  : t("courts.update")}
              </Button>
            </XStack>
          </YStack>
        </Dialog>
      </YStack>
    </ScrollView>
  );
}

// ============ SETTINGS TAB ============
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
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      Alert.alert(t("settings.saved"));
    },
    onError: () => {
      Alert.alert(t("settings.saveError"));
    },
  });

  const handleSave = () => {
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
        >
          {updateMutation.isPending ? t("shared.loading") : t("shared.save")}
        </Button>
      </YStack>
    </ScrollView>
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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<VotingCriteria | null>(
    null,
  );
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
      const res = await client.api.voting.criteria.$post({
        json: {
          code,
          nameEn,
          nameEs,
          descriptionEn: descriptionEn || undefined,
          descriptionEs: descriptionEs || undefined,
          sortOrder: parseInt(sortOrder, 10) || 0,
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
      Alert.alert(t("shared.createSuccess"));
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      Alert.alert(t("shared.createError"), error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingCriteria) return;
      const res = await client.api.voting.criteria[":id"].$patch({
        param: { id: editingCriteria.id },
        json: {
          code,
          nameEn,
          nameEs,
          descriptionEn: descriptionEn || undefined,
          descriptionEs: descriptionEs || undefined,
          sortOrder: parseInt(sortOrder, 10) || 0,
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
      Alert.alert(t("shared.updateSuccess"));
      setEditingCriteria(null);
      resetForm();
    },
    onError: (error: Error) => {
      Alert.alert(t("shared.updateError"), error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await client.api.voting.criteria[":id"].$patch({
        param: { id },
        json: { isActive },
      });
      if (!res.ok) throw new Error("Failed to toggle active status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voting-criteria-all"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (criteriaId: string) => {
      const res = await client.api.voting.criteria[":id"].$delete({
        param: { id: criteriaId },
      });
      if (!res.ok) throw new Error("Failed to delete criteria");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voting-criteria-all"] });
      Alert.alert(t("shared.deleteSuccess"));
    },
    onError: () => {
      Alert.alert(t("shared.deleteError"));
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
    Alert.alert(t("shared.confirmDelete"), t("shared.deleteConfirm"), [
      { text: t("shared.cancel"), style: "cancel" },
      {
        text: t("shared.delete"),
        style: "destructive",
        onPress: () => deleteMutation.mutate(c.id),
      },
    ]);
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
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <YStack gap="$3" paddingBottom="$6">
        {/* Add Criteria Button */}
        <Button variant="primary" onPress={() => setShowAddDialog(true)}>
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
                  >
                    {c.isActive ? t("admin.deactivate") : t("admin.activate")}
                  </Button>
                  <Button
                    size="$3"
                    variant="outline"
                    onPress={() => openEdit(c)}
                  >
                    {t("organizer.edit")}
                  </Button>
                  <Button
                    size="$3"
                    variant="danger"
                    onPress={() => handleDelete(c)}
                    disabled={deleteMutation.isPending}
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
          showActions={false}
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
            <XStack gap="$2">
              <Button
                flex={1}
                variant="outline"
                onPress={() => {
                  setShowAddDialog(false);
                  resetForm();
                }}
              >
                {t("shared.cancel")}
              </Button>
              <Button
                flex={1}
                variant="primary"
                onPress={() => createMutation.mutate()}
                disabled={
                  !code || !nameEn || !nameEs || createMutation.isPending
                }
              >
                {createMutation.isPending
                  ? t("shared.loading")
                  : t("shared.save")}
              </Button>
            </XStack>
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
          showActions={false}
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
            <XStack gap="$2">
              <Button
                flex={1}
                variant="outline"
                onPress={() => {
                  setEditingCriteria(null);
                  resetForm();
                }}
              >
                {t("shared.cancel")}
              </Button>
              <Button
                flex={1}
                variant="primary"
                onPress={() => updateMutation.mutate()}
                disabled={
                  !code || !nameEn || !nameEs || updateMutation.isPending
                }
              >
                {updateMutation.isPending
                  ? t("shared.loading")
                  : t("shared.save")}
              </Button>
            </XStack>
          </YStack>
        </Dialog>
      </YStack>
    </ScrollView>
  );
}
