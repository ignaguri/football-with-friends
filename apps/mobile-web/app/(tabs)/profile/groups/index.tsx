// @ts-nocheck - Tamagui type recursion workaround
import { useCurrentGroup, useMyGroups } from "@repo/api-client";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView } from "react-native";
import { Spinner, Text, XStack, YStack } from "tamagui";

export default function MyGroupsScreen() {
  const { t } = useTranslation();
  const { data: groups, isLoading } = useMyGroups();
  const { groupId, switchGroup } = useCurrentGroup();

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <YStack flex={1} padding="$4" gap="$2">
        <Text color="$gray11">{t("groups.myGroups.empty")}</Text>
      </YStack>
    );
  }

  return (
    <ScrollView>
      <YStack padding="$4" gap="$3">
        {groups.map((g) => {
          const badge = g.amIOwner
            ? t("groups.myGroups.owner")
            : g.myRole === "organizer"
              ? t("groups.myGroups.organizer")
              : t("groups.myGroups.member");
          const isActive = g.id === groupId;
          return (
            <Pressable
              key={g.id}
              onPress={() => {
                if (!isActive) switchGroup(g.id);
                router.push(`/(tabs)/profile/groups/${g.id}`);
              }}
            >
              <XStack
                padding="$3"
                borderRadius="$4"
                backgroundColor={isActive ? "$blue3" : "$gray2"}
                borderWidth={1}
                borderColor={isActive ? "$blue8" : "$gray5"}
                justifyContent="space-between"
                alignItems="center"
              >
                <YStack>
                  <Text fontSize="$5" fontWeight="600">
                    {g.name}
                  </Text>
                  <Text fontSize="$2" color="$gray11">
                    {badge}
                  </Text>
                </YStack>
                {isActive ? (
                  <Text fontSize="$2" color="$blue10">
                    ●
                  </Text>
                ) : null}
              </XStack>
            </Pressable>
          );
        })}
      </YStack>
    </ScrollView>
  );
}
