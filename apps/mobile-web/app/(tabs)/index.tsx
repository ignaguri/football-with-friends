import { Container, Card, Text, YStack, Spinner } from "@repo/ui";
import { useQuery, client } from "@repo/api-client";

export default function MatchesScreen() {
  const { data: matches, isLoading, error } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await client.api.matches.$get({ query: {} });
      return res.json();
    },
  });

  return (
    <Container variant="padded">
      <YStack space="$4">
        <Text fontSize="$8" fontWeight="bold">
          Upcoming Matches
        </Text>

        {isLoading && (
          <YStack alignItems="center" padding="$4">
            <Spinner size="large" />
            <Text marginTop="$2">Loading matches...</Text>
          </YStack>
        )}

        {error && (
          <Card variant="outlined" backgroundColor="$red2">
            <Text color="$red11">Error loading matches: {error.message}</Text>
          </Card>
        )}

        {!isLoading && !error && matches && matches.length === 0 && (
          <Card variant="outlined">
            <YStack space="$2">
              <Text fontSize="$6" fontWeight="600">
                No upcoming matches
              </Text>
              <Text>
                Check back later for new football matches to join!
              </Text>
            </YStack>
          </Card>
        )}

        {!isLoading && !error && matches && matches.length > 0 && (
          <>
            {matches.map((match) => (
              <Card key={match.id} variant="elevated">
                <YStack space="$2">
                  <Text fontSize="$6" fontWeight="600">
                    {match.date} at {match.time}
                  </Text>
                  <Text>Players: {match.max_players}</Text>
                  {match.cost_per_player && (
                    <Text>Cost: {match.cost_per_player}</Text>
                  )}
                </YStack>
              </Card>
            ))}
          </>
        )}
      </YStack>
    </Container>
  );
}
