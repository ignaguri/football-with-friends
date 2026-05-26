// @ts-nocheck - Tamagui type recursion workaround
import { useSearchGroups, useSubmitJoinRequest } from "@repo/api-client";
import { Container } from "@repo/ui";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Button, Input, Spinner, Text, XStack, YStack } from "tamagui";

export default function DiscoverGroupsScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useSearchGroups(query);
  const submit = useSubmitJoinRequest();

  async function onRequest(groupId: string) {
    try {
      await submit.mutateAsync({ groupId });
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : t("groups.discover.error"));
    }
  }

  return (
    <Container>
      <YStack padding="$4" gap="$3">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t("groups.discover.searchPlaceholder")}
          testID="discover-search-input"
          autoFocus
        />
        {isLoading ? <Spinner /> : null}
        {query.trim() && !isLoading && (!results || results.length === 0) ? (
          <Text color="$gray11">{t("groups.discover.noResults")}</Text>
        ) : null}
        {results?.map((g) => (
          <XStack
            key={g.id}
            padding="$3"
            borderRadius="$4"
            backgroundColor="$gray2"
            borderWidth={1}
            borderColor="$gray5"
            justifyContent="space-between"
            alignItems="center"
            testID={`discover-result-${g.id}`}
          >
            <YStack>
              <Text fontSize="$5" fontWeight="600">
                {g.name}
              </Text>
              <Text fontSize="$2" color="$gray11">
                {t("groups.discover.members", { count: g.memberCount })}
              </Text>
            </YStack>
            {g.relationship === "member" ? (
              <Button
                size="$2"
                onPress={() => router.push(`/(tabs)/profile/groups/${g.id}`)}
                accessibilityRole="button"
                testID={`discover-open-${g.id}`}
              >
                {t("groups.discover.open")}
              </Button>
            ) : g.relationship === "pending" ? (
              <Text fontSize="$2" color="$blue10">
                {t("groups.discover.pending")}
              </Text>
            ) : (
              <Button
                size="$2"
                theme="blue"
                onPress={() => onRequest(g.id)}
                disabled={submit.isPending}
                accessibilityRole="button"
                testID={`discover-request-${g.id}`}
              >
                {t("groups.discover.request")}
              </Button>
            )}
          </XStack>
        ))}
      </YStack>
    </Container>
  );
}
