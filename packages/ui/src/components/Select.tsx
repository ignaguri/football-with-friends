import { useState } from "react";
import { Platform } from "react-native";
import {
  Select as TamaguiSelect,
  SelectProps,
  YStack,
  Text,
  Adapt,
  Sheet,
  Input as TamaguiInput,
} from "tamagui";
import { Check, ChevronDown, ChevronUp } from "@tamagui/lucide-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface SelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps extends Omit<SelectProps, "children"> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

// Web-specific native select for reliability
function WebSelect({
  label,
  error,
  options,
  placeholder = "Select an option",
  value,
  onValueChange,
  disabled,
}: CustomSelectProps) {
  return (
    <YStack gap="$2">
      {label && (
        <Text fontSize="$3" fontWeight="600" color="$gray12">
          {label}
        </Text>
      )}
      <YStack>
        <select
          value={value || ""}
          onChange={(e) => onValueChange?.(e.target.value)}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            borderRadius: "8px",
            border: error ? "1px solid #e54d2e" : "1px solid #888888",
            backgroundColor: "var(--background, #fff)",
            color: "var(--color, #000)",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            backgroundSize: "16px",
            paddingRight: "40px",
          }}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </YStack>
      {error && (
        <Text fontSize="$2" color="$red10">
          {error}
        </Text>
      )}
    </YStack>
  );
}

// Native Tamagui Select for mobile with Adapt Sheet
function NativeSelect({
  label,
  error,
  options,
  placeholder = "Select an option",
  disabled,
  searchable = false,
  searchPlaceholder = "Search...",
  ...props
}: CustomSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { top, left, right } = useSafeAreaInsets();

  // Filter options based on search query
  const filteredOptions = searchable && searchQuery
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  return (
    <YStack gap="$2">
      {label && (
        <Text fontSize="$3" fontWeight="600" color="$gray12">
          {label}
        </Text>
      )}
      <TamaguiSelect {...props} disabled={disabled}>
        <TamaguiSelect.Trigger
          backgroundColor="$background"
          borderColor={error ? "$red8" : "$gray7"}
          borderWidth={1}
          padding="$3"
          iconAfter={ChevronDown}
          opacity={disabled ? 0.5 : 1}
        >
          <TamaguiSelect.Value placeholder={placeholder} />
        </TamaguiSelect.Trigger>

        <Adapt platform="touch">
          <Sheet
            modal
            dismissOnSnapToBottom
            snapPointsMode="fit"
          >
            <Sheet.Frame paddingTop={top} paddingLeft={left} paddingRight={right}>
              {searchable && (
                <YStack paddingHorizontal="$4" paddingTop="$3" paddingBottom="$2">
                  <TamaguiInput
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    borderColor="$gray7"
                    backgroundColor="$background"
                  />
                </YStack>
              )}
              <Sheet.ScrollView>
                <Adapt.Contents />
              </Sheet.ScrollView>
            </Sheet.Frame>
            <Sheet.Overlay
              animation="lazy"
              enterStyle={{ opacity: 0 }}
              exitStyle={{ opacity: 0 }}
            />
          </Sheet>
        </Adapt>

        <TamaguiSelect.Content zIndex={200000}>
          <TamaguiSelect.ScrollUpButton
            alignItems="center"
            justifyContent="center"
            position="relative"
            width="100%"
            height="$3"
          >
            <ChevronUp size={20} />
          </TamaguiSelect.ScrollUpButton>

          <TamaguiSelect.Viewport minWidth={200}>
            <TamaguiSelect.Group>
              {filteredOptions.map((option, index) => (
                <TamaguiSelect.Item
                  key={option.value}
                  index={index}
                  value={option.value}
                >
                  <TamaguiSelect.ItemText>{option.label}</TamaguiSelect.ItemText>
                  <TamaguiSelect.ItemIndicator marginLeft="auto">
                    <Check size={16} />
                  </TamaguiSelect.ItemIndicator>
                </TamaguiSelect.Item>
              ))}
            </TamaguiSelect.Group>
          </TamaguiSelect.Viewport>

          <TamaguiSelect.ScrollDownButton
            alignItems="center"
            justifyContent="center"
            position="relative"
            width="100%"
            height="$3"
          >
            <ChevronDown size={20} />
          </TamaguiSelect.ScrollDownButton>
        </TamaguiSelect.Content>
      </TamaguiSelect>
      {error && (
        <Text fontSize="$2" color="$red10">
          {error}
        </Text>
      )}
    </YStack>
  );
}

export function Select(props: CustomSelectProps) {
  if (Platform.OS === "web") {
    return <WebSelect {...props} />;
  }
  return <NativeSelect {...props} />;
}
