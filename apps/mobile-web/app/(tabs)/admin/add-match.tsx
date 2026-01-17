import { useState, useEffect } from "react";
import {
  Container,
  Card,
  Text,
  YStack,
  Button,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Spinner,
} from "@repo/ui";
import { useSession, useQuery, useMutation, useQueryClient, client } from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { ScrollView, Alert } from "react-native";
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

export default function AddMatchScreen() {
  const { t } = useTranslation();
  const { data: session, isPending: isSessionPending } = useSession();
  const queryClient = useQueryClient();

  // Form state
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [locationId, setLocationId] = useState("");
  const [courtId, setCourtId] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [costPerPlayer, setCostPerPlayer] = useState("");
  const [shirtCost, setShirtCost] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "admin";

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
          costPerPlayer: costPerPlayer || undefined,
          shirtCost: shirtCost || undefined,
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
      Alert.alert(t("addMatch.created"), "", [
        {
          text: "OK",
          onPress: () => {
            if (data?.match?.id) {
              router.replace(`/(tabs)/matches/${data.match.id}`);
            } else {
              router.back();
            }
          },
        },
      ]);
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
      <Container variant="padded">
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" />
          <Text marginTop="$2" color="$gray11">{t("shared.loading")}</Text>
        </YStack>
      </Container>
    );
  }

  // Auth check
  if (!session?.user) {
    return (
      <Container variant="padded">
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color="$gray11">{t("addMatch.mustSignIn")}</Text>
          <Button marginTop="$4" onPress={() => router.push("/(auth)/sign-in")}>
            {t("shared.signIn")}
          </Button>
        </YStack>
      </Container>
    );
  }

  // Admin check
  if (!isAdmin) {
    return (
      <Container variant="padded">
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color="$red10">{t("addMatch.unauthorized")}</Text>
        </YStack>
      </Container>
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
    <Container variant="padded">
      <ScrollView style={{ flex: 1 }}>
        <YStack gap="$4" paddingBottom="$6">
          <Card variant="elevated">
            <YStack padding="$4" gap="$4">
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

              {/* Cost Per Player */}
              <Input
                value={costPerPlayer}
                onChangeText={setCostPerPlayer}
                label={t("addMatch.costCourt")}
                placeholder={t("addMatch.costPlaceholder")}
                keyboardType="decimal-pad"
                disabled={createMutation.isPending}
              />

              {/* Shirt Cost */}
              <Input
                value={shirtCost}
                onChangeText={setShirtCost}
                label={t("organizer.table.costShirts")}
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
          </Card>
        </YStack>
      </ScrollView>
    </Container>
  );
}
