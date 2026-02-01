// @ts-nocheck - Tamagui type recursion workaround
import { Container, Card, Text, YStack, XStack, Button, Spinner, Dialog, List } from "@repo/ui";
import { useSession } from "@repo/api-client";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { useTheme } from "tamagui";
import { User, Calendar, Users } from "@tamagui/lucide-icons";
import { Pressable } from "react-native";
import { useRulesModal } from "../../lib/rules-modal-context";

export default function HomeScreen() {
  const { data: session, isPending } = useSession();
  const { t } = useTranslation();
  const theme = useTheme();
  const { showModal, dismissModal, dismissPermanently } = useRulesModal();

  const isAuthenticated = !!session?.user;

  // Get the first 4 general rules for the modal
  const generalRules = t("rules.general", { returnObjects: true }) as string[];
  const rulesPreview = Array.isArray(generalRules) ? generalRules.slice(0, 4) : [];

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

          {isPending ? (
            <Spinner size="large" />
          ) : isAuthenticated ? (
            <YStack gap="$4" width="100%" maxWidth={400}>
              <Text fontSize="$5" color="$gray11" textAlign="center">
                {t("home.welcome", { name: session?.user?.name || session?.user?.email?.split("@")[0] })}
              </Text>

              <Pressable onPress={() => router.push("/(tabs)/player")}>
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
                        {t("home.playerCard")}
                      </Text>
                      <Text fontSize="$3" color="$gray11" marginTop="$1">
                        {t("home.playerCardDesc")}
                      </Text>
                    </YStack>
                  </XStack>
                </Card>
              </Pressable>

              <Pressable onPress={() => router.push("/(tabs)/matches")}>
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
                      <Calendar size={24} color="$blue10" />
                    </YStack>
                    <YStack flex={1}>
                      <Text fontSize="$6" fontWeight="bold">
                        {t("home.matchesCard")}
                      </Text>
                      <Text fontSize="$3" color="$gray11" marginTop="$1">
                        {t("home.matchesCardDesc")}
                      </Text>
                    </YStack>
                  </XStack>
                </Card>
              </Pressable>

              <Pressable onPress={() => router.push("/(tabs)/social")}>
                <Card variant="elevated" padding="$5">
                  <XStack gap="$4" alignItems="center">
                    <YStack
                      width={48}
                      height={48}
                      borderRadius={12}
                      backgroundColor="$purple4"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Users size={24} color="$purple10" />
                    </YStack>
                    <YStack flex={1}>
                      <Text fontSize="$6" fontWeight="bold">
                        {t("home.socialCard")}
                      </Text>
                      <Text fontSize="$3" color="$gray11" marginTop="$1">
                        {t("home.socialCardDesc")}
                      </Text>
                    </YStack>
                  </XStack>
                </Card>
              </Pressable>
            </YStack>
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

      {/* Rules Modal Dialog */}
      <Dialog
        open={showModal && isAuthenticated}
        onOpenChange={(open) => !open && dismissModal()}
        title={t("rules.generalTitle")}
        showActions={false}
      >
        <YStack gap="$3">
          <Text color="$gray11" fontSize="$4">
            {t("rules.description")}
          </Text>

          <List ordered bulletColor="$blue10">
            {rulesPreview.map((rule, index) => (
              <List.Item key={index} fontSize="$3">
                {rule}
              </List.Item>
            ))}
          </List>

          <YStack gap="$3" marginTop="$4">
            <Button
              variant="primary"
              onPress={() => {
                dismissModal();
                router.push("/(tabs)/rules");
              }}
            >
              {t("matchDetail.viewRules")}
            </Button>

            <Button
              variant="outline"
              onPress={dismissPermanently}
            >
              I already read the rules
            </Button>
          </YStack>
        </YStack>
      </Dialog>
    </>
  );
}
