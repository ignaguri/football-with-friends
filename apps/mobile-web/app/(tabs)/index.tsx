// @ts-nocheck - Tamagui type recursion workaround
import { Container, Card, Text, YStack, Button, Spinner } from "@repo/ui";
import { useSession, useQuery, client } from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { useTheme } from "tamagui";

export default function HomeScreen() {
  const { data: session, isPending } = useSession();
  const { t } = useTranslation();
  const theme = useTheme();

  const isAuthenticated = !!session?.user;

  // Fetch upcoming matches count
  const { data: matches } = useQuery({
    queryKey: ["matches", "upcoming"],
    queryFn: async () => {
      const res = await client.api.matches.$get({
        query: { type: "upcoming" },
      });
      return res.json();
    },
  });

  const upcomingCount = matches?.length || 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: t("shared.home"),
          headerStyle: {
            backgroundColor: theme.background?.val,
          },
          headerTintColor: theme.color?.val,
          headerShadowVisible: false,
        }}
      />
      <Container variant="padded">
        <YStack flex={1} justifyContent="center" alignItems="center" gap="$6">
          {/* App Title */}
          <YStack alignItems="center" gap="$2">
            <Text fontSize="$9" fontWeight="bold" textAlign="center">
              {t("home.title")}
            </Text>
            <Text color="$gray11" textAlign="center" maxWidth={300}>
              {t("home.description")}
            </Text>
          </YStack>

          {/* Quick Stats / Welcome Message */}
          {isPending ? (
            <Spinner size="large" />
          ) : isAuthenticated ? (
            <Card variant="elevated" width="100%" maxWidth={300}>
              <YStack padding="$4" gap="$3" alignItems="center">
                <Text fontSize="$5" color="$gray11">
                  {t("home.welcome", { name: session?.user?.name || session?.user?.email?.split("@")[0] })}
                </Text>
                {upcomingCount > 0 && (
                  <Button
                    variant="primary"
                    onPress={() => router.push("/(tabs)/matches")}
                  >
                    {t("home.upcomingMatches", { count: upcomingCount })}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onPress={() => router.push("/(tabs)/players")}
                >
                  {t("playerStats.tabTitle")}
                </Button>
              </YStack>
            </Card>
          ) : (
            <Card variant="elevated" width="100%" maxWidth={300}>
              <YStack padding="$4" gap="$3" alignItems="center">
                <Text fontSize="$5" color="$gray11" textAlign="center">
                  {t("home.signInPrompt")}
                </Text>
                <Button
                  variant="primary"
                  onPress={() => router.push("/(auth)/sign-in")}
                >
                  {t("shared.signIn")}
                </Button>
              </YStack>
            </Card>
          )}
        </YStack>
      </Container>
    </>
  );
}
