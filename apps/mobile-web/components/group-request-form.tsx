// Shared submit-and-clear logic + field layout behind the two group-request
// screens: onboarding (`app/mode.tsx`) and settings (`(tabs)/profile/groups/request.tsx`).
// The two screens intentionally use different copy (onboarding vs settings
// tone), so i18n strings stay owned by each screen and are passed in as props.

import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { useSubmitGroupRequest } from "@repo/api-client";
import { Button, Input, Text, YStack } from "@repo/ui";
import { TextArea } from "tamagui";

export interface UseGroupRequestFormResult {
  name: string;
  setName: (value: string) => void;
  reason: string;
  setReason: (value: string) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

export function useGroupRequestForm(): UseGroupRequestFormResult {
  const { t } = useTranslation();
  const submitRequest = useSubmitGroupRequest();
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");

  async function onSubmit() {
    if (!name.trim() || !reason.trim()) return;
    try {
      await submitRequest.mutateAsync({ name: name.trim(), reason: reason.trim() });
      setName("");
      setReason("");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : t("groups.requests.error"));
    }
  }

  return { name, setName, reason, setReason, onSubmit, isSubmitting: submitRequest.isPending };
}

export interface GroupRequestFieldsProps {
  form: UseGroupRequestFormResult;
  testIDPrefix: string;
  nameLabel: string;
  namePlaceholder: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  submitContent: ReactNode;
  multilineReason?: boolean;
  autoFocusName?: boolean;
}

export function GroupRequestFields({
  form,
  testIDPrefix,
  nameLabel,
  namePlaceholder,
  reasonLabel,
  reasonPlaceholder,
  submitContent,
  multilineReason,
  autoFocusName,
}: GroupRequestFieldsProps) {
  const { name, setName, reason, setReason, onSubmit, isSubmitting } = form;
  const disabled = !name.trim() || !reason.trim() || isSubmitting;

  return (
    <YStack gap="$3">
      <Input
        label={nameLabel}
        placeholder={namePlaceholder}
        value={name}
        onChangeText={setName}
        testID={`${testIDPrefix}-name`}
        autoFocus={autoFocusName}
      />
      {multilineReason ? (
        <YStack gap="$2">
          <Text fontSize="$4">{reasonLabel}</Text>
          <TextArea
            value={reason}
            onChangeText={setReason}
            placeholder={reasonPlaceholder}
            testID={`${testIDPrefix}-reason`}
            numberOfLines={4}
          />
        </YStack>
      ) : (
        <Input
          label={reasonLabel}
          placeholder={reasonPlaceholder}
          value={reason}
          onChangeText={setReason}
          testID={`${testIDPrefix}-reason`}
        />
      )}
      <Button
        onPress={onSubmit}
        disabled={disabled}
        opacity={disabled ? 0.5 : 1}
        testID={`${testIDPrefix}-submit`}
      >
        {submitContent}
      </Button>
    </YStack>
  );
}

export interface GroupRequestPendingCardProps {
  name: string;
  pendingLabel: string;
  actions?: ReactNode;
}

export function GroupRequestPendingCard({ name, pendingLabel, actions }: GroupRequestPendingCardProps) {
  return (
    <YStack gap="$2">
      <Text fontSize="$5" fontWeight="600">
        {name}
      </Text>
      <Text color="$gray11">{pendingLabel}</Text>
      {actions}
    </YStack>
  );
}
