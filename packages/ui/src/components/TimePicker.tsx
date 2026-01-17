import { useState } from "react";
import { Platform, Pressable, Modal, FlatList } from "react-native";
import { YStack, Text, XStack, Button } from "tamagui";
import { Clock } from "@tamagui/lucide-icons";

export interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

// Generate time slots in 30-minute increments
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export function TimePicker({
  value,
  onChange,
  label,
  placeholder = "Select time",
  error,
  disabled = false,
}: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  // For web, we use a native select
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
          <Clock size={20} color="$gray10" />
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
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
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </XStack>
        {error && (
          <Text fontSize="$2" color="$red10">
            {error}
          </Text>
        )}
      </YStack>
    );
  }

  // For native, show a modal picker
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
          <Clock size={20} color="$gray10" />
          <Text marginLeft="$3" color={value ? "$color" : "$gray10"}>
            {value || placeholder}
          </Text>
        </XStack>
      </Pressable>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          onPress={() => setShowPicker(false)}
        >
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            backgroundColor="$background"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
            maxHeight={400}
          >
            <XStack padding="$4" justifyContent="space-between" alignItems="center">
              <Text fontSize="$5" fontWeight="600">
                {label || "Select Time"}
              </Text>
              <Button size="$3" onPress={() => setShowPicker(false)}>
                Done
              </Button>
            </XStack>
            <FlatList
              data={TIME_SLOTS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item);
                    setShowPicker(false);
                  }}
                >
                  <XStack
                    padding="$3"
                    backgroundColor={value === item ? "$blue4" : "transparent"}
                    borderBottomWidth={1}
                    borderBottomColor="$borderColor"
                  >
                    <Text
                      fontSize="$5"
                      fontWeight={value === item ? "600" : "400"}
                      color={value === item ? "$blue10" : "$color"}
                    >
                      {item}
                    </Text>
                  </XStack>
                </Pressable>
              )}
            />
          </YStack>
        </Pressable>
      </Modal>

      {error && (
        <Text fontSize="$2" color="$red10">
          {error}
        </Text>
      )}
    </YStack>
  );
}
