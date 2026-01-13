import { Text, YStack, Button, Container, Spinner, Card } from "@repo/ui";
import { useSession, signOut } from "../../src/lib/auth-client";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth");
  };

  if (isPending) {
    return (
      <Container variant="centered">
        <Spinner label="Loading profile..." />
      </Container>
    );
  }

  if (!session) {
    return (
      <Container variant="centered">
        <YStack space="$4" alignItems="center">
          <Text fontSize="$5" color="$gray11">
            Not signed in
          </Text>
          <Button variant="primary" onPress={() => router.replace("/auth")}>
            Sign In
          </Button>
        </YStack>
      </Container>
    );
  }

  return (
    <Container variant="padded">
      <YStack space="$4">
        <Text fontSize="$8" fontWeight="bold">
          Profile
        </Text>

        <Card variant="outlined">
          <YStack space="$4">
            <YStack space="$2">
              <Text fontSize="$3" color="$gray10" fontWeight="600">
                NAME
              </Text>
              <Text fontSize="$5">{session.user.name}</Text>
            </YStack>

            <YStack space="$2">
              <Text fontSize="$3" color="$gray10" fontWeight="600">
                EMAIL
              </Text>
              <Text fontSize="$5">{session.user.email}</Text>
            </YStack>
          </YStack>
        </Card>

        <Button variant="danger" onPress={handleSignOut} marginTop="$4">
          Sign Out
        </Button>
      </YStack>
    </Container>
  );
}
