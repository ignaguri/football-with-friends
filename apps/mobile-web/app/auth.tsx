import { Text, Button, YStack } from "tamagui";

export default function AuthScreen() {
  const handleGoogleSignIn = async () => {
    // TODO: Implement Google OAuth flow
  };

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
      <Text fontSize="$8" fontWeight="bold" marginBottom="$4">
        Football with Friends
      </Text>
      <Text fontSize="$4" marginBottom="$8" color="$gray10">
        Sign in to organize and join matches
      </Text>
      <Button size="$4" onPress={handleGoogleSignIn}>
        Sign in with Google
      </Button>
    </YStack>
  );
}
