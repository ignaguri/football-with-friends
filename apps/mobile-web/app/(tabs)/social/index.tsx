// @ts-nocheck - Tamagui type recursion workaround
import { Container, Card, Text, YStack, XStack } from "@repo/ui";
import { BarChart3, Image } from "@tamagui/lucide-icons";
import { router, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";

export default function SocialHubScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <Container variant="padded">
      <YStack
        gap="$4"
        flex={1}
        justifyContent="center"
        maxWidth={400}
        marginHorizontal="auto"
        width="100%"
      >
        <Pressable onPress={() => router.push("/(tabs)/social/stats")}>
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
                  {t("social.statsCard")}
                </Text>
                <Text fontSize="$3" color="$gray11" marginTop="$1">
                  {t("social.statsCardDesc")}
                </Text>
              </YStack>
            </XStack>
          </Card>
        </Pressable>

        <Card variant="elevated" padding="$5" opacity={0.6}>
          <XStack gap="$4" alignItems="center">
            <YStack
              width={48}
              height={48}
              borderRadius={12}
              backgroundColor="$purple4"
              alignItems="center"
              justifyContent="center"
            >
              <Image size={24} color="$purple10" />
            </YStack>
            <YStack flex={1}>
              <Text fontSize="$6" fontWeight="bold">
                {t("social.multimediaCard")}
              </Text>
              <Text fontSize="$3" color="$gray11" marginTop="$1">
                {t("social.multimediaCardDesc")}
              </Text>
            </YStack>
          </XStack>
        </Card>
      </YStack>
    </Container>
    </>
  );
}
