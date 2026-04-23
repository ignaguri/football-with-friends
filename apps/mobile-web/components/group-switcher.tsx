// @ts-nocheck - Tamagui type recursion workaround
// Hidden at <2 groups so single-group accounts keep the legacy mono-group
// chrome unchanged.

import { useCurrentGroup } from "@repo/api-client";
import { Check, ChevronDown } from "@tamagui/lucide-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sheet, Text, XStack, YStack } from "tamagui";

export function GroupSwitcher() {
  const { t } = useTranslation();
  const { group, myGroups, switchGroup } = useCurrentGroup();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  if (myGroups.length < 2 || !group) return null;

  return (
    <>
      <XStack
        accessibilityRole="button"
        accessibilityLabel={t("groups.switcher.open", { name: group.name })}
        testID="group-switcher-trigger"
        onPress={() => setOpen(true)}
        pressStyle={{ opacity: 0.7 }}
        paddingHorizontal="$4"
        paddingVertical="$2"
        alignItems="center"
        gap="$2"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        backgroundColor="$background"
      >
        <Text color="$gray11" fontSize="$2">
          {t("groups.switcher.label")}
        </Text>
        <Text fontSize="$3" fontWeight="600" flexShrink={1} numberOfLines={1}>
          {group.name}
        </Text>
        <ChevronDown size={14} color="$gray10" />
      </XStack>

      <Sheet
        modal
        open={open}
        onOpenChange={setOpen}
        snapPointsMode="fit"
        dismissOnSnapToBottom
        animation="medium"
      >
        <Sheet.Overlay />
        <Sheet.Handle />
        <Sheet.Frame
          backgroundColor="$background"
          paddingBottom={insets.bottom + 16}
        >
          <YStack padding="$4" gap="$1">
            <Text fontSize="$5" fontWeight="700" marginBottom="$2">
              {t("groups.switcher.label")}
            </Text>
            {myGroups.map((g) => {
              const active = g.id === group.id;
              return (
                <XStack
                  key={g.id}
                  accessibilityRole="button"
                  testID={`group-switcher-item-${g.id}`}
                  onPress={() => {
                    if (!active) switchGroup(g.id);
                    setOpen(false);
                  }}
                  pressStyle={{ opacity: 0.7 }}
                  paddingVertical="$3"
                  paddingHorizontal="$3"
                  alignItems="center"
                  gap="$2"
                  borderRadius="$3"
                  backgroundColor={active ? "$blue3" : "transparent"}
                >
                  <Text flex={1} fontSize="$4" fontWeight={active ? "600" : "400"}>
                    {g.name}
                  </Text>
                  {active ? <Check size={18} color="$blue10" /> : null}
                </XStack>
              );
            })}
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
