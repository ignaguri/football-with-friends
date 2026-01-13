import { Select as TamaguiSelect, SelectProps, YStack, Text } from "tamagui";
import { Check, ChevronDown, ChevronUp } from "@tamagui/lucide-icons";

export interface SelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps extends Omit<SelectProps, "children"> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  options,
  placeholder = "Select an option",
  ...props
}: CustomSelectProps) {
  return (
    <YStack space="$2">
      {label && (
        <Text fontSize="$3" fontWeight="600" color="$gray12">
          {label}
        </Text>
      )}
      <TamaguiSelect {...props}>
        <TamaguiSelect.Trigger
          backgroundColor="$background"
          borderColor={error ? "$red8" : "$gray7"}
          borderWidth={1}
          padding="$3"
          iconAfter={ChevronDown}
        >
          <TamaguiSelect.Value placeholder={placeholder} />
        </TamaguiSelect.Trigger>

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
              {options.map((option, index) => (
                <TamaguiSelect.Item
                  key={option.value}
                  index={index}
                  value={option.value}
                >
                  <TamaguiSelect.ItemText>
                    {option.label}
                  </TamaguiSelect.ItemText>
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
