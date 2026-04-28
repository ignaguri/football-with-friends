// @ts-nocheck - Tamagui type recursion workaround

import { Card, Container, Text } from "@repo/ui";
import { Settings } from "@tamagui/lucide-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Platform, ScrollView } from "react-native";
import { Spinner, Switch, XStack, YStack } from "tamagui";

import { NotificationPermissionPrompt } from "../../../components/notifications/notification-permission-prompt";
import {
  type NotificationCategoryKey,
  useNotificationPreferencesContext,
} from "../../../lib/notifications/notification-preferences-context";

const CATEGORIES: {
  key: NotificationCategoryKey;
  i18nKey: string;
  testID: string;
}[] = [
  {
    key: "pushNewMatch",
    i18nKey: "newMatch",
    testID: "profile-notifications-toggle-new-match",
  },
  {
    key: "pushMatchReminder",
    i18nKey: "matchReminder",
    testID: "profile-notifications-toggle-match-reminder",
  },
  {
    key: "pushPromoToConfirmed",
    i18nKey: "promoToConfirmed",
    testID: "profile-notifications-toggle-promo",
  },
];

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const notif = useNotificationPreferencesContext();
  const [promptOpen, setPromptOpen] = useState(false);

  if (Platform.OS === "web") {
    return (
      <Container variant="padded">
        <YStack gap="$4">
          <Text fontSize="$5" fontWeight="600">
            {t("notifications.settings.entry")}
          </Text>
          <Text color="$gray11">{t("notifications.unsupportedWeb")}</Text>
        </YStack>
      </Container>
    );
  }

  if (notif.isLoading) {
    return (
      <Container variant="centered">
        <Spinner size="large" />
      </Container>
    );
  }

  const masterOn = notif.effectivelyEnabled;
  const categoriesDisabled = !masterOn;

  async function handleMasterToggle(value: boolean) {
    if (!value) {
      await notif.disableMaster();
      return;
    }
    if (notif.osStatus === "undetermined") {
      setPromptOpen(true);
      return;
    }
    if (notif.osStatus === "denied") {
      Linking.openSettings();
      return;
    }
    await notif.enableMaster();
  }

  return (
    <Container>
      <ScrollView>
        <YStack padding="$4" gap="$4">
          <Card variant="outlined">
            <YStack gap="$3">
              <Text fontSize="$5" fontWeight="600">
                {t("notifications.settings.master")}
              </Text>
              <Text fontSize="$3" color="$gray11">
                {t("notifications.settings.masterHint")}
              </Text>

              <XStack
                justifyContent="space-between"
                alignItems="center"
                marginTop="$2"
              >
                <Text color="$gray11">
                  {t("notifications.settings.masterLabel")}
                </Text>
                <Switch
                  checked={masterOn}
                  onCheckedChange={handleMasterToggle}
                  size="$3"
                  testID="profile-notifications-toggle-master"
                >
                  <Switch.Thumb animation="quick" />
                </Switch>
              </XStack>

              {notif.osStatus === "denied" && (
                <YStack
                  gap="$2"
                  padding="$3"
                  borderRadius="$4"
                  backgroundColor="$yellow3"
                  borderWidth={1}
                  borderColor="$yellow7"
                >
                  <XStack gap="$2" alignItems="center">
                    <Settings size={16} color="$yellow11" />
                    <Text fontSize="$4" fontWeight="600" color="$yellow11">
                      {t("notifications.denied.title")}
                    </Text>
                  </XStack>
                  <Text fontSize="$3" color="$yellow11">
                    {t("notifications.denied.body")}
                  </Text>
                  <Text
                    fontSize="$3"
                    fontWeight="600"
                    color="$blue10"
                    onPress={() => Linking.openSettings()}
                    accessibilityRole="link"
                    testID="profile-notifications-open-settings"
                  >
                    {t("notifications.denied.openSettings")}
                  </Text>
                </YStack>
              )}
            </YStack>
          </Card>

          <Card variant="outlined">
            <YStack gap="$3">
              <Text fontSize="$5" fontWeight="600">
                {t("notifications.settings.categoriesTitle")}
              </Text>

              {CATEGORIES.map(({ key, i18nKey, testID }) => (
                <CategoryRow
                  key={key}
                  label={t(`notifications.categories.${i18nKey}`)}
                  hint={t(`notifications.categories.${i18nKey}Hint`)}
                  checked={Boolean(notif.prefs?.[key])}
                  disabled={categoriesDisabled}
                  onChange={(v) => notif.setCategory(key, v)}
                  testID={testID}
                />
              ))}
            </YStack>
          </Card>
        </YStack>
      </ScrollView>

      <NotificationPermissionPrompt
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
      />
    </Container>
  );
}

function CategoryRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
  testID,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  testID: string;
}) {
  return (
    <XStack
      justifyContent="space-between"
      alignItems="center"
      gap="$3"
      opacity={disabled ? 0.5 : 1}
    >
      <YStack flex={1} gap="$1">
        <Text color="$gray12">{label}</Text>
        <Text fontSize="$2" color="$gray10">
          {hint}
        </Text>
      </YStack>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        size="$3"
        testID={testID}
      >
        <Switch.Thumb animation="quick" />
      </Switch>
    </XStack>
  );
}
