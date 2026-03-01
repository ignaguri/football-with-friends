import { useState } from "react";
import { Text, XStack, YStack } from "tamagui";
import { Button } from "./Button";
import { Input } from "./Input";

export interface StatsInputRowProps {
  matchDate: string;
  matchVenue?: string;
  value: number;
  confirmed: boolean;
  onConfirm: (value: number) => void;
  editable: boolean;
  confirmLabel?: string;
  modifyLabel?: string;
}

export function StatsInputRow({
  matchDate,
  matchVenue,
  value,
  confirmed,
  onConfirm,
  editable,
  confirmLabel = "Confirm",
  modifyLabel = "Modify",
}: StatsInputRowProps) {
  const [isEditing, setIsEditing] = useState(!confirmed);
  const [inputValue, setInputValue] = useState(String(value));

  const handleConfirm = () => {
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && num >= 0) {
      onConfirm(num);
      setIsEditing(false);
    }
  };

  const handleModify = () => {
    setIsEditing(true);
  };

  return (
    <XStack
      alignItems="center"
      padding="$2"
      borderBottomWidth={1}
      borderBottomColor="$gray5"
      gap="$2"
    >
      <YStack flex={1} gap="$1">
        <Text fontSize="$3" fontWeight="500">
          {matchDate}
        </Text>
        {matchVenue && (
          <Text fontSize="$2" color="$gray10">
            {matchVenue}
          </Text>
        )}
      </YStack>
      {editable ? (
        <XStack alignItems="center" gap="$2">
          {isEditing ? (
            <>
              <Input
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType="numeric"
                width={60}
                textAlign="center"
                size="$3"
              />
              <Button size="$2" onPress={handleConfirm}>
                {confirmLabel}
              </Button>
            </>
          ) : (
            <>
              <Text fontSize="$5" fontWeight="700" minWidth={30} textAlign="center">
                {value}
              </Text>
              <Button size="$2" variant="outline" onPress={handleModify}>
                {modifyLabel}
              </Button>
            </>
          )}
        </XStack>
      ) : (
        <Text fontSize="$5" fontWeight="700" minWidth={30} textAlign="center">
          {value}
        </Text>
      )}
    </XStack>
  );
}
