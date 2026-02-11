import {
  useSession,
  useQuery,
  useMutation,
  useQueryClient,
  client,
} from "@repo/api-client";
import {
  Text,
  YStack,
  Button,
  Input,
  Select,
  TimePicker,
  Spinner,
  useToastController,
  ScrollView,
} from "@repo/ui";
import { router, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface Location {
  id: string;
  name: string;
  address?: string;
}

interface Court {
  id: string;
  name: string;
  description?: string;
  locationId: string;
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
  location?: { id: string; name: string; address?: string };
  court?: { id: string; name: string };
}

// Extract the actual error message from API errors.
const getApiErrorMessage = (error: Error): string => {
  const apiError = error as Error & { data?: { error?: string } };
  if (apiError.data && typeof apiError.data === "object" && "error" in apiError.data) {
    return (apiError.data as { error: string }).error;
  }
  return error.message;
};

export default function EditMatchScreen() {
  const { t } = useTranslation();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { data: session, isPending: isSessionPending } = useSession();
  const queryClient = useQueryClient();
  const toast = useToastController();

  // Form state
  const [time, setTime] = useState("");
  const [locationId, setLocationId] = useState("");
  const [courtId, setCourtId] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [costPerPlayer, setCostPerPlayer] = useState("");
  const [sameDayCost, setSameDayCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  // Fetch existing match data
  const { data: match, isLoading: isLoadingMatch } = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const res = await client.api.matches[":id"].$get({
        param: { id: matchId! },
        query: { userId: session?.user?.id || "" },
      });
      return res.json() as Promise<MatchDetails>;
    },
    enabled: !!matchId && !!session?.user,
  });

  // Fetch locations
  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await client.api.locations.$get();
      return res.json() as Promise<Location[]>;
    },
  });

  // Fetch courts for selected location
  const { data: courts = [], isLoading: isLoadingCourts } = useQuery({
    queryKey: ["courts", locationId],
    queryFn: async () => {
      const res = await client.api.courts.$get({
        query: { locationId },
      });
      return res.json() as Promise<Court[]>;
    },
    enabled: !!locationId,
  });

  // Pre-fill form when match data loads
  useEffect(() => {
    if (match && !initialized) {
      setTime(match.time || "");
      setLocationId(match.location?.id || "");
      setCourtId(match.court?.id || "");
      setMaxPlayers(String(match.maxPlayers || 10));
      setCostPerPlayer(match.costPerPlayer || "");
      setSameDayCost(match.sameDayCost || "");
      setInitialized(true);
    }
  }, [match, initialized]);

  // Update match mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!time || !locationId) {
        throw new Error(t("errors.missingFields"));
      }

      const res = await client.api.matches[":id"].$patch({
        param: { id: matchId! },
        json: {
          time,
          locationId,
          courtId: courtId || undefined,
          maxPlayers: parseInt(maxPlayers) || 10,
          costPerPlayer: costPerPlayer || undefined,
          sameDayCost: sameDayCost || undefined,
        },
      });

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      toast.show(t("organizer.updateSuccess"), { duration: 3000, customData: { variant: "success" } });
      router.navigate("/(tabs)/admin");
    },
    onError: (err: Error) => {
      setError(getApiErrorMessage(err));
    },
  });

  const handleSubmit = () => {
    setError(null);

    if (!time) {
      setError(t("addMatch.timeFormat"));
      return;
    }
    if (!locationId) {
      setError(t("addMatch.locationRequired"));
      return;
    }

    updateMutation.mutate();
  };

  // Loading state
  if (isSessionPending || isLoadingMatch) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$4"
        backgroundColor="$background"
      >
        <Spinner size="large" />
        <Text marginTop="$2" color="$gray11">
          {t("shared.loading")}
        </Text>
      </YStack>
    );
  }

  // Auth check
  if (!session?.user) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$4"
        backgroundColor="$background"
      >
        <Text color="$gray11">{t("addMatch.mustSignIn")}</Text>
        <Button marginTop="$4" onPress={() => router.push("/(auth)")}>
          {t("shared.signIn")}
        </Button>
      </YStack>
    );
  }

  // Admin check
  if (!isAdmin) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$4"
        backgroundColor="$background"
      >
        <Text color="$red10">{t("addMatch.unauthorized")}</Text>
      </YStack>
    );
  }

  if (!match) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$4"
        backgroundColor="$background"
      >
        <Text color="$red10">{t("errors.matchNotFound")}</Text>
      </YStack>
    );
  }

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: loc.name + (loc.address ? ` - ${loc.address}` : ""),
  }));

  const courtOptions = [
    { value: "", label: t("addMatch.noSpecificCourt") },
    ...courts.map((court) => ({
      value: court.id,
      label: court.name + (court.description ? ` - ${court.description}` : ""),
    })),
  ];

  return (
    <YStack flex={1} backgroundColor="$background">
    <ScrollView style={{ flex: 1 }}>
      <YStack padding="$4" gap="$4" paddingBottom="$8">
        {/* Date (read-only) */}
        <YStack gap="$1">
          <Text fontSize="$3" color="$gray11" fontWeight="500">
            {t("shared.date")}
          </Text>
          <Input
            value={match.date}
            disabled
            opacity={0.6}
          />
        </YStack>

        {/* Time Picker */}
        <TimePicker
          value={time}
          onChange={setTime}
          label={t("shared.time")}
          placeholder={t("addMatch.selectTime")}
          disabled={updateMutation.isPending}
        />

        {/* Location Select */}
        <Select
          value={locationId}
          onValueChange={(id) => {
            setLocationId(id);
            setCourtId("");
          }}
          label={t("addMatch.location")}
          placeholder={t("addMatch.selectLocation")}
          options={locationOptions}
          disabled={updateMutation.isPending || isLoadingLocations}
        />

        {/* Court Select */}
        {!!locationId && (
          <Select
            value={courtId}
            onValueChange={setCourtId}
            label={t("addMatch.court")}
            placeholder={t("addMatch.selectCourt")}
            options={courtOptions}
            disabled={updateMutation.isPending || isLoadingCourts}
          />
        )}

        {/* Max Players */}
        <Input
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          label={t("addMatch.maxPlayers")}
          keyboardType="number-pad"
          disabled={updateMutation.isPending}
        />

        {/* Cost Per Player */}
        <Input
          value={costPerPlayer}
          onChangeText={setCostPerPlayer}
          label={t("addMatch.costPerPlayer")}
          placeholder={t("addMatch.costPlaceholder")}
          keyboardType="decimal-pad"
          disabled={updateMutation.isPending}
        />

        {/* Same Day Extra Cost */}
        <Input
          value={sameDayCost}
          onChangeText={setSameDayCost}
          label={t("addMatch.sameDayCost")}
          placeholder={t("addMatch.costPlaceholder")}
          keyboardType="decimal-pad"
          disabled={updateMutation.isPending}
        />

        {/* Error Message */}
        {error && (
          <Text color="$red10" textAlign="center">
            {error}
          </Text>
        )}

        {/* Submit Button */}
        <Button
          variant="primary"
          size="$5"
          onPress={handleSubmit}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? t("editMatch.saving") : t("editMatch.save")}
        </Button>
      </YStack>
    </ScrollView>
    </YStack>
  );
}
