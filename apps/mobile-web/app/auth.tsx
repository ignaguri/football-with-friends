import { Text, Button, YStack, Container } from "@repo/ui";

export default function AuthScreen() {
  const handleGoogleSignIn = async () => {
    // TODO: Implement Google OAuth flow
  };

  return (
    <Container variant="centered">
      <YStack space="$6" alignItems="center" maxWidth={400}>
        <YStack space="$3" alignItems="center">
          <Text fontSize="$9" fontWeight="bold" textAlign="center">
            Football with Friends
          </Text>
          <Text fontSize="$4" color="$gray11" textAlign="center">
            Sign in to organize and join matches with your friends
          </Text>
        </YStack>
        <Button
          variant="primary"
          size="$4"
          width="100%"
          onPress={handleGoogleSignIn}
        >
          Sign in with Google
        </Button>
      </YStack>
    </Container>
  );
}
