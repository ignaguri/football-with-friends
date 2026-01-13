import { useState, useEffect } from "react";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Button,
  Input,
  UserAvatar,
  Spinner,
} from "@repo/ui";
import { Link, router } from "expo-router";
import { useSession, signOut, client } from "@repo/api-client";

export default function ProfileScreen() {
  const { data: session, isPending } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [displayUsername, setDisplayUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      setUsername((session.user as any).username || "");
      setDisplayUsername((session.user as any).displayUsername || "");
    }
  }, [session?.user]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const handleSaveProfile = async () => {
    if (!session?.user) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await client.api.profile["update-username"].$post({
        json: {
          userId: session.user.id,
          username: username || null,
          displayUsername: displayUsername || null,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError((data as any).error || "Failed to update profile");
        return;
      }

      setIsEditing(false);
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Save profile error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isPending) {
    return (
      <Container variant="padded">
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
          <Text marginTop="$2">Loading...</Text>
        </YStack>
      </Container>
    );
  }

  if (!session?.user) {
    return (
      <Container variant="padded">
        <YStack space="$6" flex={1} justifyContent="center" alignItems="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center">
            Welcome to Fulbo con los pibes
          </Text>
          <Text color="$gray11" textAlign="center">
            Sign in to manage your profile and join matches
          </Text>

          <YStack space="$3" width="100%" maxWidth={300}>
            <Link href="/(auth)/sign-in" asChild>
              <Button variant="primary">Sign In</Button>
            </Link>
            <Link href="/(auth)/sign-up" asChild>
              <Button variant="outline">Create Account</Button>
            </Link>
          </YStack>
        </YStack>
      </Container>
    );
  }

  const user = session.user as any;
  const displayName = user.displayUsername || user.username || user.name;

  return (
    <Container variant="padded">
      <YStack space="$4">
        <Text fontSize="$8" fontWeight="bold">
          Profile
        </Text>

        <Card variant="elevated" padding="$4">
          <YStack space="$4">
            <XStack space="$4" alignItems="center">
              <UserAvatar
                name={user.name}
                username={user.username}
                displayUsername={user.displayUsername}
                image={user.image}
                profilePicture={user.profilePicture}
                size={80}
              />
              <YStack flex={1}>
                <Text fontSize="$6" fontWeight="600">
                  {displayName}
                </Text>
                <Text color="$gray11" fontSize="$3">
                  {user.email}
                </Text>
                {user.username && (
                  <Text color="$gray10" fontSize="$2">
                    @{user.username}
                  </Text>
                )}
              </YStack>
            </XStack>

            {isEditing ? (
              <YStack space="$3">
                <Input
                  label="Username"
                  placeholder="Choose a username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  helperText="3-20 characters, letters, numbers, underscores"
                />

                <Input
                  label="Display Name"
                  placeholder="How you want to be called"
                  value={displayUsername}
                  onChangeText={setDisplayUsername}
                />

                {error && (
                  <Text color="$red10" fontSize="$3">
                    {error}
                  </Text>
                )}

                <XStack space="$2">
                  <Button
                    flex={1}
                    variant="outline"
                    onPress={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    flex={1}
                    variant="primary"
                    onPress={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? <Spinner size="small" /> : "Save"}
                  </Button>
                </XStack>
              </YStack>
            ) : (
              <Button variant="outline" onPress={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </YStack>
        </Card>

        <Card variant="outlined">
          <YStack space="$2">
            <Text fontSize="$5" fontWeight="600">
              Account Info
            </Text>
            <YStack space="$1">
              <XStack justifyContent="space-between">
                <Text color="$gray11">Name</Text>
                <Text>{user.name || "Not set"}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$gray11">Email</Text>
                <Text>{user.email}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$gray11">Auth Method</Text>
                <Text>
                  {user.image?.includes("google") ? "Google" : "Email/Password"}
                </Text>
              </XStack>
            </YStack>
          </YStack>
        </Card>

        <Button variant="danger" onPress={handleSignOut}>
          Sign Out
        </Button>
      </YStack>
    </Container>
  );
}
