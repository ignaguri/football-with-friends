// @ts-nocheck — Tamagui type recursion workaround (matches sibling components)
import { ArrowUpCircle, X } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, XStack } from "tamagui";

import { useStoreUpdate } from "../lib/store-update/use-store-update";

export function StoreUpdateBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { available, storeUrl, dismiss } = useStoreUpdate();

  if (Platform.OS === "web") return null;
  if (!available || !storeUrl) return null;

  return (
    <XStack
      backgroundColor="$blue3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      paddingHorizontal="$3"
      paddingTop={insets.top + 8}
      paddingBottom="$2"
      alignItems="center"
      gap="$2"
      testID="store-update-banner"
    >
      <ArrowUpCircle size={18} color="$blue11" />
      <Text flex={1} color="$blue12" fontSize="$3">
        {t("storeUpdate.available")}
      </Text>
      <Button
        size="$2"
        theme="blue"
        onPress={() => {
          Linking.openURL(storeUrl).catch(() => {});
        }}
        testID="store-update-banner-update"
        accessibilityRole="button"
      >
        {t("storeUpdate.update")}
      </Button>
      <Button
        size="$2"
        chromeless
        circular
        icon={X}
        onPress={() => {
          void dismiss();
        }}
        testID="store-update-banner-dismiss"
        accessibilityRole="button"
        accessibilityLabel={t("storeUpdate.dismiss")}
      />
    </XStack>
  );
}
