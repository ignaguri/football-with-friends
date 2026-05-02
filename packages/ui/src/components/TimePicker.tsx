import { useState } from "react";
import { Platform, Pressable } from "react-native";
import { YStack, Text, XStack, Button } from "tamagui";
import { Clock } from "@tamagui/lucide-icons-2";
import DateTimePicker from "@react-native-community/datetimepicker";

export interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function TimePicker({
  value,
  onChange,
  label,
  placeholder = "Select time",
  error,
  disabled = false,
}: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date | null>(null);

  const parseTimeToDate = (timeStr: string): Date => {
    const date = new Date();
    if (timeStr) {
      const [hoursStr, minutesStr] = timeStr.split(":");
      const hours = parseInt(hoursStr || "19", 10);
      const minutes = parseInt(minutesStr || "0", 10);
      date.setHours(hours, minutes, 0, 0);
    } else {
      // Default to 19:00 (7 PM) if no value
      date.setHours(19, 0, 0, 0);
    }
    return date;
  };

  const formatTimeFromDate = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleTimeChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (selectedDate) {
        onChange(formatTimeFromDate(selectedDate));
      }
    } else if (selectedDate) {
      // On iOS, store temporarily until Done is pressed
      setTempTime(selectedDate);
    }
  };

  const handleDone = () => {
    const finalTime = tempTime || parseTimeToDate(value);
    onChange(formatTimeFromDate(finalTime));
    setTempTime(null);
    setShowPicker(false);
  };

  const handleOpen = () => {
    if (!disabled) {
      setTempTime(null);
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
          <Clock size={20} color="$gray10" />
          <Text marginLeft="$3" color={value ? "$color" : "$gray10"}>
            {value || placeholder}
          </Text>
        </XStack>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={parseTimeToDate(value)}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
          minuteInterval={30}
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
