import { useState } from "react";
import { Container, Card, Text, YStack, Input, Button, Spinner } from "@repo/ui";
import { Link, router } from "expo-router";
import { signIn } from "@repo/api-client";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Sign in failed");
        return;
      }

      // Navigate to main app
      router.replace("/(tabs)");
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
      setError("Google sign in failed");
      console.error("Google sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container variant="padded">
      <YStack space="$6" flex={1} justifyContent="center" maxWidth={400} marginHorizontal="auto">
        <YStack space="$2" alignItems="center">
          <Text fontSize="$9" fontWeight="bold">
            Welcome Back
          </Text>
          <Text color="$gray11" textAlign="center">
            Sign in to continue to Fulbo con los pibes
          </Text>
        </YStack>

        <Card variant="elevated" padding="$4">
          <YStack space="$4">
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={error && !email ? "Email is required" : undefined}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={error && !password ? "Password is required" : undefined}
            />

            {error && (
              <Text color="$red10" fontSize="$3" textAlign="center">
                {error}
              </Text>
            )}

            <Button
              onPress={handleSignIn}
              disabled={isLoading}
              variant="primary"
            >
              {isLoading ? <Spinner size="small" /> : "Sign In"}
            </Button>

            <YStack space="$3" alignItems="center">
              <Text color="$gray10" fontSize="$3">
                or continue with
              </Text>

              <Button
                onPress={handleGoogleSignIn}
                disabled={isLoading}
                variant="outline"
                width="100%"
              >
                Sign in with Google
              </Button>
            </YStack>
          </YStack>
        </Card>

        <YStack space="$2" alignItems="center">
          <Text color="$gray11">
            Don't have an account?{" "}
            <Link href="/(auth)/sign-up" asChild>
              <Text color="$blue10" fontWeight="600">
                Sign Up
              </Text>
            </Link>
          </Text>
        </YStack>
      </YStack>
    </Container>
  );
}
