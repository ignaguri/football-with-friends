// @ts-nocheck - Tamagui type recursion workaround
import { useCreateGroup, useCurrentGroup, useSession } from "@repo/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Button, Input, Spinner, Text, YStack } from "tamagui";

export default function CreateGroupScreen() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { switchGroup } = useCurrentGroup();
  const [name, setName] = useState("");
  const createMutation = useCreateGroup();

  if (session?.user?.role !== "admin") {
    return (
      <YStack flex={1} padding="$4" justifyContent="center" alignItems="center">
        <Text color="$gray11">{t("groups.create.adminOnly")}</Text>
      </YStack>
    );
  }

  async function onSubmit() {
    if (!name.trim()) return;
    try {
      const group = await createMutation.mutateAsync({ name: name.trim() });
      switchGroup(group.id);
      router.replace(`/(tabs)/profile/groups/${group.id}`);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <YStack flex={1} padding="$4" gap="$3">
      <Text fontSize="$4">{t("groups.create.nameLabel")}</Text>
      <Input
        value={name}
        onChangeText={setName}
        placeholder={t("groups.create.namePlaceholder")}
        autoFocus
      />
      <Button
        theme="blue"
        onPress={onSubmit}
        disabled={!name.trim() || createMutation.isPending}
      >
        {createMutation.isPending ? <Spinner /> : t("groups.create.cta")}
      </Button>
    </YStack>
  );
}
