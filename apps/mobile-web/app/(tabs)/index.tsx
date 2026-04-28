// @ts-nocheck - Tamagui type recursion workaround
import { useSession } from "@repo/api-client";
import {
  Container,
  Card,
  Text,
  YStack,
  XStack,
  Button,
  Spinner,
  Dialog,
  List,
} from "@repo/ui";
import { Calendar, Trophy, CircleUserRound } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";
import { useTheme } from "tamagui";

import { InboxBell } from "../../components/notifications/inbox-bell";
import { NotificationPermissionPrompt } from "../../components/notifications/notification-permission-prompt";
import { useNotificationPreferencesContext } from "../../lib/notifications/notification-preferences-context";
import { useRulesModal } from "../../lib/rules-modal-context";

export default function HomeScreen() {
  const { data: session, isPending } = useSession();
  const { t } = useTranslation();
  const theme = useTheme();
  const { showModal, dismissModal, dismissPermanently } = useRulesModal();

  const notif = useNotificationPreferencesContext();
  const [notifPromptOpen, setNotifPromptOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!session?.user) return;
    if (notif.isLoading) return;
    if (notif.hasShownPrompt) return;
    if (notif.osStatus !== "undetermined") return;
    setNotifPromptOpen(true);
  }, [session?.user, notif.isLoading, notif.hasShownPrompt, notif.osStatus]);

  const isAuthenticated = !!session?.user;

  // Get the first 4 general rules for the modal
  const generalRules = t("rules.general", { returnObjects: true }) as string[];
  const rulesPreview = Array.isArray(generalRules)
    ? generalRules.slice(0, 4)
    : [];

  return (
    <>
      <Stack.Screen
        options={{
          title: t("shared.home"),
          headerTitle: "",
          headerStyle: {
            backgroundColor: theme.background?.val,
          },
          headerTintColor: theme.color?.val,
          headerShadowVisible: false,
          headerRight: isAuthenticated ? () => <InboxBell /> : undefined,
        }}
      />
      <Container variant="padded">
        <YStack flex={1} justifyContent="center" alignItems="center" gap="$6">
          {/* App Title */}
          <YStack alignItems="center" gap="$2">
            <Text fontSize="$9" fontWeight="bold" textAlign="center">
              {t("home.title")}
            </Text>
          </YStack>

          {isPending ? (
            <Spinner size="large" />
          ) : isAuthenticated ? (
            <YStack gap="$4" width="100%" maxWidth={400}>
              <Text fontSize="$4" color="$gray11" textAlign="center">
                {t("home.welcome", {
                  name:
                    session?.user?.name || session?.user?.email?.split("@")[0],
                })}
              </Text>

              {/* Matches Button */}
              <Button
                variant="navy"
                size="$5"
                onPress={() => router.push("/(tabs)/matches")}
                borderRadius={28}
                height={60}
              >
                <XStack gap="$3" alignItems="center">
                  <Calendar size={24} color="white" />
                  <Text color="white" fontSize="$6" fontWeight="500">
                    {t("home.matchesCard")}
                  </Text>
                </XStack>
              </Button>

              {/* Social Button */}
              <Button
                variant="navy"
                size="$5"
                onPress={() => router.push("/(tabs)/social")}
                borderRadius={28}
                height={60}
              >
                <XStack gap="$3" alignItems="center">
                  <Trophy size={24} color="white" />
                  <Text color="white" fontSize="$6" fontWeight="500">
                    {t("home.socialCard")}
                  </Text>
                </XStack>
              </Button>

              {/* Profile Button */}
              <Button
                variant="navy"
                size="$5"
                onPress={() => router.push("/(tabs)/profile")}
                borderRadius={28}
                height={60}
              >
                <XStack gap="$3" alignItems="center">
                  <CircleUserRound size={24} color="white" />
                  <Text color="white" fontSize="$6" fontWeight="500">
                    {t("home.playerCard")}
                  </Text>
                </XStack>
              </Button>
            </YStack>
          ) : (
            <Card variant="elevated" width="100%" maxWidth={300}>
              <YStack padding="$4" gap="$3" alignItems="center">
                <Text fontSize="$5" color="$gray11" textAlign="center">
                  {t("home.signInPrompt")}
                </Text>
                <Button
                  variant="primary"
                  onPress={() => router.push("/(auth)")}
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

            <Button variant="outline" onPress={dismissPermanently}>
              {t("rules.alreadyRead")}
            </Button>
          </YStack>
        </YStack>
      </Dialog>

      {Platform.OS !== "web" && (
        <NotificationPermissionPrompt
          open={notifPromptOpen}
          onClose={() => setNotifPromptOpen(false)}
        />
      )}
    </>
  );
}
