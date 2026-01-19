import { YStack, Text, XStack } from "tamagui";
import { Clock } from "@tamagui/lucide-icons";

export interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

// Generate time slots in 30-minute increments starting from 5 PM
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 17; hour < 24; hour++) {
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
  return (
    <YStack gap="$2">
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
          onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
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
