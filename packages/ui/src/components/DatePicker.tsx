import { useState } from "react";
import { Platform, Pressable } from "react-native";
import { YStack, Text, XStack, Button } from "tamagui";
import { Calendar } from "@tamagui/lucide-icons";

export interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
  error,
  disabled = false,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // For web, we use a native input type="date"
  if (Platform.OS === "web") {
    return (
      <YStack space="$2">
        {label && (
          <Text fontSize="$3" fontWeight="600" color="$gray12">
            {label}
          </Text>
        )}
        <XStack
          alignItems="center"
          backgroundColor="$background"
          borderColor={error ? "$red8" : "$borderColor"}
          borderWidth={1}
          borderRadius="$4"
          padding="$3"
          opacity={disabled ? 0.5 : 1}
        >
          <Calendar size={20} color="$gray10" />
          <input
            type="date"
            value={value ? value.toISOString().split("T")[0] : ""}
            onChange={(e) => {
              if (e.target.value) {
                onChange(new Date(e.target.value + "T12:00:00"));
              }
            }}
            disabled={disabled}
            style={{
              flex: 1,
              marginLeft: 12,
              border: "none",
              background: "transparent",
              fontSize: 16,
              color: "inherit",
              outline: "none",
            }}
          />
        </XStack>
        {error && (
          <Text fontSize="$2" color="$red10">
            {error}
          </Text>
        )}
      </YStack>
    );
  }

  // For native, use a button that triggers the native date picker
  return (
    <YStack space="$2">
      {label && (
        <Text fontSize="$3" fontWeight="600" color="$gray12">
          {label}
        </Text>
      )}
      <Pressable onPress={() => !disabled && setShowPicker(true)}>
        <XStack
          alignItems="center"
          backgroundColor="$background"
          borderColor={error ? "$red8" : "$borderColor"}
          borderWidth={1}
          borderRadius="$4"
          padding="$3"
          opacity={disabled ? 0.5 : 1}
        >
          <Calendar size={20} color="$gray10" />
          <Text marginLeft="$3" color={value ? "$color" : "$gray10"}>
            {value ? formatDate(value) : placeholder}
          </Text>
        </XStack>
      </Pressable>
      {error && (
        <Text fontSize="$2" color="$red10">
          {error}
        </Text>
      )}
    </YStack>
  );
}
