import { View, Text, YStack, Button } from "tamagui";
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
      <View flex={1} justifyContent="center" alignItems="center">
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text marginBottom="$4">Not signed in</Text>
        <Button onPress={() => router.replace("/auth")}>Sign In</Button>
      </View>
    );
  }

  return (
    <YStack flex={1} padding="$4" space="$4">
      <Text fontSize="$8" fontWeight="bold">
        Profile
      </Text>
      <YStack space="$2" marginTop="$4">
        <Text fontSize="$5" color="$gray10">
          Name
        </Text>
        <Text fontSize="$6">{session.user.name}</Text>
      </YStack>
      <YStack space="$2">
        <Text fontSize="$5" color="$gray10">
          Email
        </Text>
        <Text fontSize="$6">{session.user.email}</Text>
      </YStack>
      <Button marginTop="$8" onPress={handleSignOut} theme="red">
        Sign Out
      </Button>
    </YStack>
  );
}
