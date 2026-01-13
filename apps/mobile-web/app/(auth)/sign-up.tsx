import { useState } from "react";
import { Container, Card, Text, YStack, Input, Button, Spinner } from "@repo/ui";
import { Link, router } from "expo-router";
import { signUp, signIn } from "@repo/api-client";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      setError("Please fill in all required fields");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (username && (username.length < 3 || username.length > 20)) {
      setError("Username must be between 3 and 20 characters");
      return;
    }

    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signUp.email({
        email,
        password,
        name,
        username: username || undefined,
      });

      if (result.error) {
        setError(result.error.message || "Sign up failed");
        return;
      }

      // Navigate to main app
      router.replace("/(tabs)");
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Sign up error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use full URL for callback - window.location.origin for web, or hardcoded for native
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:8081";
      await signIn.social({
        provider: "google",
        callbackURL: `${baseUrl}/(tabs)`,
      });
    } catch (err) {
      setError("Google sign up failed");
      console.error("Google sign up error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container variant="padded">
      <YStack space="$6" flex={1} justifyContent="center" maxWidth={400} marginHorizontal="auto">
        <YStack space="$2" alignItems="center">
          <Text fontSize="$9" fontWeight="bold">
            Create Account
          </Text>
          <Text color="$gray11" textAlign="center">
            Sign up for Fulbo con los pibes
          </Text>
        </YStack>

        <Card variant="elevated" padding="$4">
          <YStack space="$4">
            <Input
              label="Name *"
              placeholder="Your full name"
              value={name}
              onChangeText={setName}
              error={error && !name ? "Name is required" : undefined}
            />

            <Input
              label="Email *"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={error && !email ? "Email is required" : undefined}
            />

            <Input
              label="Password *"
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={error && !password ? "Password is required" : undefined}
              helperText="Must be at least 8 characters"
            />

            <Input
              label="Username (optional)"
              placeholder="Choose a username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              helperText="3-20 characters, letters, numbers, underscores only"
            />

            {error && (
              <Text color="$red10" fontSize="$3" textAlign="center">
                {error}
              </Text>
            )}

            <Button
              onPress={handleSignUp}
              disabled={isLoading}
              variant="primary"
            >
              {isLoading ? <Spinner size="small" /> : "Create Account"}
            </Button>

            <YStack space="$3" alignItems="center">
              <Text color="$gray10" fontSize="$3">
                or continue with
              </Text>

              <Button
                onPress={handleGoogleSignUp}
                disabled={isLoading}
                variant="outline"
                width="100%"
              >
                Sign up with Google
              </Button>
            </YStack>
          </YStack>
        </Card>

        <YStack space="$2" alignItems="center">
          <Text color="$gray11">
            Already have an account?{" "}
            <Link href="/(auth)/sign-in" asChild>
              <Text color="$blue10" fontWeight="600">
                Sign In
              </Text>
            </Link>
          </Text>
        </YStack>
      </YStack>
    </Container>
  );
}
