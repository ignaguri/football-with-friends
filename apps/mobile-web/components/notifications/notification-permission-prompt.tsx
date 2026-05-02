// @ts-nocheck - Tamagui type recursion workaround

import { Bell, CalendarPlus, Clock, UserCheck } from "@tamagui/lucide-icons-2";
import { Button, Dialog } from "@repo/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Spinner, Text, XStack, YStack } from "tamagui";

import { useNotificationPreferencesContext } from "../../lib/notifications/notification-preferences-context";

interface Props {
  open: boolean;
  onClose: () => void;
}

const BENEFITS: { Icon: typeof Bell; i18nKey: string }[] = [
  { Icon: CalendarPlus, i18nKey: "newMatch" },
  { Icon: Clock, i18nKey: "matchReminder" },
  { Icon: UserCheck, i18nKey: "promoToConfirmed" },
];

export function NotificationPermissionPrompt({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { enableMaster, markPromptShown } = useNotificationPreferencesContext();
  const [isWorking, setIsWorking] = useState(false);

  async function handleEnable() {
    setIsWorking(true);
    try {
      const { status } = await enableMaster();
      await markPromptShown();
      onClose();
      if (status === "denied") {
        Alert.alert(t("notifications.denied.title"), t("notifications.denied.body"));
      }
    } catch (e) {
      console.error("Failed to enable notifications:", e);
      Alert.alert(t("notifications.errors.generic"), e instanceof Error ? e.message : "");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSkip() {
    await markPromptShown();
    onClose();
  }

  return (
    <Dialog
      modal
      open={open}
      onOpenChange={(v) => {
        if (!v) void handleSkip();
      }}
      showActions={false}
      showClose={false}
    >
      <YStack alignItems="center" gap="$3">
        <YStack
          width={64}
          height={64}
          borderRadius="$10"
          backgroundColor="$blue4"
          justifyContent="center"
          alignItems="center"
        >
          <Bell size={32} color="$blue10" />
        </YStack>
        <Text fontSize="$7" fontWeight="700" textAlign="center">
          {t("notifications.prompt.title")}
        </Text>
        <Text fontSize="$4" color="$gray11" textAlign="center">
          {t("notifications.prompt.body")}
        </Text>
      </YStack>

      <YStack gap="$3" marginVertical="$2">
        {BENEFITS.map(({ Icon, i18nKey }) => (
          <Benefit
            key={i18nKey}
            Icon={Icon}
            title={t(`notifications.prompt.benefits.${i18nKey}.title`)}
            body={t(`notifications.prompt.benefits.${i18nKey}.body`)}
          />
        ))}
      </YStack>

      <YStack gap="$2">
        <Button
          variant="primary"
          size="$5"
          onPress={handleEnable}
          disabled={isWorking}
          testID="notification-prompt-enable"
        >
          {isWorking ? <Spinner size="small" /> : t("notifications.prompt.enable")}
        </Button>
        <Button
          variant="ghost"
          onPress={handleSkip}
          disabled={isWorking}
          testID="notification-prompt-skip"
        >
          {t("notifications.prompt.later")}
        </Button>
      </YStack>
    </Dialog>
  );
}

function Benefit({ Icon, title, body }: { Icon: typeof Bell; title: string; body: string }) {
  return (
    <XStack gap="$3" alignItems="flex-start">
      <YStack
        width={36}
        height={36}
        borderRadius="$4"
        backgroundColor="$gray3"
        justifyContent="center"
        alignItems="center"
      >
        <Icon size={20} color="$gray11" />
      </YStack>
      <YStack flex={1} gap="$1">
        <Text fontSize="$4" fontWeight="600">
          {title}
        </Text>
        <Text fontSize="$3" color="$gray11">
          {body}
        </Text>
      </YStack>
    </XStack>
  );
}
