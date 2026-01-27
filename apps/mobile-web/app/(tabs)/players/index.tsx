// @ts-nocheck - Tamagui type recursion workaround
import { Container, Card, Text, YStack, XStack } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { BarChart3, User } from "@tamagui/lucide-icons";
import { Pressable } from "react-native";

export default function PlayersHubScreen() {
  const { t } = useTranslation();

  return (
    <Container variant="padded">
      <YStack gap="$4" flex={1} justifyContent="center" maxWidth={400} marginHorizontal="auto" width="100%">
        <Pressable onPress={() => router.push("/(tabs)/players/stats")}>
          <Card variant="elevated" padding="$5">
            <XStack gap="$4" alignItems="center">
              <YStack
                width={48}
                height={48}
                borderRadius={12}
                backgroundColor="$blue4"
                alignItems="center"
                justifyContent="center"
              >
                <BarChart3 size={24} color="$blue10" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$6" fontWeight="bold">
                  {t("playerStats.statsHub")}
                </Text>
                <Text fontSize="$3" color="$gray11" marginTop="$1">
                  {t("playerStats.statsHubDesc")}
                </Text>
              </YStack>
            </XStack>
          </Card>
        </Pressable>

        <Pressable onPress={() => router.push("/(tabs)/players/my-info")}>
          <Card variant="elevated" padding="$5">
            <XStack gap="$4" alignItems="center">
              <YStack
                width={48}
                height={48}
                borderRadius={12}
                backgroundColor="$green4"
                alignItems="center"
                justifyContent="center"
              >
                <User size={24} color="$green10" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$6" fontWeight="bold">
                  {t("playerStats.myInfo")}
                </Text>
                <Text fontSize="$3" color="$gray11" marginTop="$1">
                  {t("playerStats.myInfoDesc")}
                </Text>
              </YStack>
            </XStack>
          </Card>
        </Pressable>
      </YStack>
    </Container>
  );
}
