import { useState } from "react";
import { Platform, Pressable } from "react-native";
import { YStack, Text, XStack, Button } from "tamagui";
import { Calendar } from "@tamagui/lucide-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

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
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (selectedDate) {
        onChange(selectedDate);
      }
    } else if (selectedDate) {
      // On iOS, store temporarily until Done is pressed
      setTempDate(selectedDate);
    }
  };

  const handleDone = () => {
    const finalDate = tempDate || value || new Date();
    onChange(finalDate);
    setTempDate(null);
    setShowPicker(false);
  };

  const handleOpen = () => {
    if (!disabled) {
      setTempDate(null);
      setShowPicker(true);
    }
  };

  return (
    <YStack gap="$2">
      {label && (
        <Text fontSize="$3" fontWeight="600" color="$gray12">
          {label}
        </Text>
      )}
      <Pressable onPress={handleOpen}>
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
      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
        />
      )}
      {Platform.OS === "ios" && showPicker && (
        <Button size="$3" onPress={handleDone}>
          Done
        </Button>
      )}
      {error && (
        <Text fontSize="$2" color="$red10">
          {error}
        </Text>
      )}
    </YStack>
  );
}
