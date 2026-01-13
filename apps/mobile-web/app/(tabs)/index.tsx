import {
  Text,
  YStack,
  XStack,
  ScrollView,
  Card,
  Container,
  Spinner,
  Badge,
} from "@repo/ui";
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
      <Container variant="centered">
        <Spinner label="Loading matches..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container variant="centered">
        <YStack space="$2" alignItems="center">
          <Text color="$red10" fontSize="$5" fontWeight="600">
            Error loading matches
          </Text>
          <Text color="$gray10">{error.message}</Text>
        </YStack>
      </Container>
    );
  }

  return (
    <ScrollView flex={1}>
      <Container variant="padded">
        <YStack space="$4">
          <Text fontSize="$6" fontWeight="bold">
            Upcoming Matches
          </Text>
          {matches && matches.length === 0 ? (
            <Text color="$gray10">No upcoming matches</Text>
          ) : (
            matches?.map((match) => (
              <Card key={match.id} variant="outlined">
                <YStack space="$3">
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$5" fontWeight="600">
                      {match.court.name}
                    </Text>
                    <Badge variant="info">
                      {match.signups?.filter((s) => s.status === "confirmed")
                        .length || 0}
                      /{match.maxPlayers}
                    </Badge>
                  </XStack>
                  <XStack space="$2" alignItems="center">
                    <Text color="$gray11" fontSize="$3">
                      {match.date}
                    </Text>
                    <Text color="$gray9">•</Text>
                    <Text color="$gray11" fontSize="$3">
                      {match.time}
                    </Text>
                  </XStack>
                </YStack>
              </Card>
            ))
          )}
        </YStack>
      </Container>
    </ScrollView>
  );
}
