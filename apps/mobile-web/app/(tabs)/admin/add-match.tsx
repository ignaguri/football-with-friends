import { useState, useEffect } from "react";
import {
  Text,
  YStack,
  Button,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Spinner,
  useToastController,
  ScrollView,
} from "@repo/ui";
import { useSession, useQuery, useMutation, useQueryClient, client } from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { format } from "date-fns";

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

interface AppSettings {
  default_cost_per_player: string;
  same_day_extra_cost: string;
  default_max_substitutes: string;
  paypal_url: string;
  organizer_whatsapp: string;
}

export default function AddMatchScreen() {
  const { t } = useTranslation();
  const { data: session, isPending: isSessionPending } = useSession();
  const queryClient = useQueryClient();
  const toast = useToastController();

  // Form state
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [locationId, setLocationId] = useState("");
  const [courtId, setCourtId] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [maxSubstitutes, setMaxSubstitutes] = useState("2");
  const [costPerPlayer, setCostPerPlayer] = useState("");
  const [sameDayCost, setSameDayCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  // Fetch settings to pre-fill costs
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await client.api.settings.$get();
      return res.json() as Promise<AppSettings>;
    },
  });

  // Pre-fill costs from settings (only once when settings load)
  useEffect(() => {
    if (settings && !settingsLoaded) {
      if (settings.default_cost_per_player) {
        setCostPerPlayer(settings.default_cost_per_player);
      }
      if (settings.same_day_extra_cost) {
        setSameDayCost(settings.same_day_extra_cost);
      }
      if (settings.default_max_substitutes) {
        setMaxSubstitutes(settings.default_max_substitutes);
      }
      setSettingsLoaded(true);
    }
  }, [settings, settingsLoaded]);

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

  // Reset court when location changes
  useEffect(() => {
    setCourtId("");
  }, [locationId]);

  // Create match mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!date || !time || !locationId) {
        throw new Error(t("errors.missingFields"));
      }

      const formattedDate = format(date, "yyyy-MM-dd");

      const res = await client.api.matches.$post({
        json: {
          date: formattedDate,
          time,
          locationId,
          courtId: courtId || undefined,
          maxPlayers: parseInt(maxPlayers) || 10,
          maxSubstitutes: parseInt(maxSubstitutes) || 2,
          costPerPlayer: costPerPlayer || undefined,
          sameDayCost: sameDayCost || undefined,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as any).error || t("addMatch.error"));
      }

      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.show(t("addMatch.created"), { duration: 3000 });
      // Auto-redirect after successful creation
      if (data?.match?.id) {
        router.replace(`/(tabs)/matches/${data.match.id}`);
      } else {
        router.replace("/(tabs)/matches");
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = () => {
    setError(null);

    if (!date) {
      setError(t("addMatch.dateRequired"));
      return;
    }
    if (!time) {
      setError(t("addMatch.timeFormat"));
      return;
    }
    if (!locationId) {
      setError(t("addMatch.locationRequired"));
      return;
    }

    createMutation.mutate();
  };

  // Loading state
  if (isSessionPending) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" backgroundColor="$background">
        <Spinner size="large" />
        <Text marginTop="$2" color="$gray11">{t("shared.loading")}</Text>
      </YStack>
    );
  }

  // Auth check
  if (!session?.user) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" backgroundColor="$background">
        <Text color="$gray11">{t("addMatch.mustSignIn")}</Text>
        <Button marginTop="$4" onPress={() => router.push("/(auth)/sign-in")}>
          {t("shared.signIn")}
        </Button>
      </YStack>
    );
  }

  // Admin check
  if (!isAdmin) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" backgroundColor="$background">
        <Text color="$red10">{t("addMatch.unauthorized")}</Text>
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
    <ScrollView backgroundColor="$background">
      <YStack padding="$4" gap="$4" paddingBottom="$8">
        {/* Date Picker */}
        <DatePicker
          value={date}
          onChange={setDate}
          label={t("shared.date")}
          placeholder={t("addMatch.selectDate")}
          disabled={createMutation.isPending}
        />

        {/* Time Picker */}
        <TimePicker
          value={time}
          onChange={setTime}
          label={t("shared.time")}
          placeholder={t("addMatch.selectTime")}
          disabled={createMutation.isPending}
        />

        {/* Location Select */}
        <Select
          value={locationId}
          onValueChange={setLocationId}
          label={t("addMatch.location")}
          placeholder={t("addMatch.selectLocation")}
          options={locationOptions}
          disabled={createMutation.isPending || isLoadingLocations}
        />

        {/* Court Select */}
        {locationId && (
          <Select
            value={courtId}
            onValueChange={setCourtId}
            label={t("addMatch.court")}
            placeholder={t("addMatch.selectCourt")}
            options={courtOptions}
            disabled={createMutation.isPending || isLoadingCourts}
          />
        )}

        {/* Max Players */}
        <Input
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          label={t("addMatch.maxPlayers")}
          keyboardType="number-pad"
          disabled={createMutation.isPending}
        />

        {/* Max Substitutes */}
        <Input
          value={maxSubstitutes}
          onChangeText={setMaxSubstitutes}
          label={t("addMatch.maxSubstitutes")}
          keyboardType="number-pad"
          disabled={createMutation.isPending}
        />

        {/* Cost Per Player */}
        <Input
          value={costPerPlayer}
          onChangeText={setCostPerPlayer}
          label={t("addMatch.costPerPlayer")}
          placeholder={t("addMatch.costPlaceholder")}
          keyboardType="decimal-pad"
          disabled={createMutation.isPending}
        />

        {/* Same Day Extra Cost */}
        <Input
          value={sameDayCost}
          onChangeText={setSameDayCost}
          label={t("addMatch.sameDayCost")}
          placeholder={t("addMatch.costPlaceholder")}
          keyboardType="decimal-pad"
          disabled={createMutation.isPending}
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
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? t("addMatch.adding") : t("addMatch.add")}
        </Button>
      </YStack>
    </ScrollView>
  );
}
