import { View, Text, YStack, XStack, Card, ScrollView, Spinner } from "tamagui";
import { useQuery } from "@repo/api-client";

export default function MatchesScreen() {
  const {
    data: matches,
    isLoading,
    error,
  } = useQuery({
    route: ["matches", "getAll"],
    input: { type: "upcoming" },
  });

  if (isLoading) {
    return (
      <View flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text color="$red10">Error loading matches</Text>
        <Text color="$gray10" marginTop="$2">
          {error.message}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView flex={1} padding="$4">
      <YStack space="$4">
        <Text fontSize="$6" fontWeight="bold">
          Upcoming Matches
        </Text>
        {matches && matches.length === 0 ? (
          <Text color="$gray10">No upcoming matches</Text>
        ) : (
          matches?.map((match) => (
            <Card key={match.id} padding="$4" elevate>
              <YStack space="$2">
                <Text fontSize="$5" fontWeight="600">
                  {match.court.name}
                </Text>
                <XStack space="$2">
                  <Text color="$gray10">{match.date}</Text>
                  <Text color="$gray10">•</Text>
                  <Text color="$gray10">{match.time}</Text>
                </XStack>
                <XStack space="$2" marginTop="$2">
                  <Text color="$green10">
                    {match.signups?.filter((s) => s.status === "confirmed")
                      .length || 0}{" "}
                    confirmed
                  </Text>
                  <Text color="$gray10">•</Text>
                  <Text color="$gray10">{match.maxPlayers} max</Text>
                </XStack>
              </YStack>
            </Card>
          ))
        )}
      </YStack>
    </ScrollView>
  );
}
