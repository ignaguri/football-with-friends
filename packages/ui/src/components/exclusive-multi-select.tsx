import { useMemo } from "react";
import { Platform } from "react-native";
import { YStack, XStack, Text, Card, Button } from "tamagui";
import { X } from "@tamagui/lucide-icons-2";
import type { SelectOption } from "./Select";
import { Select } from "./Select";

export interface SelectionItem {
  id: string;
  label: string;
  description?: string;
}

export interface ExclusiveSelection {
  itemId: string;
  selectedValue: string | undefined;
}

export interface ExclusiveMultiSelectProps {
  /** List of items (criteria) to select from */
  items: SelectionItem[];
  /** Available options (e.g., players) to select */
  options: SelectOption[];
  /** Current selections (item ID -> selected option value) */
  selections: Record<string, string | undefined>;
  /** Callback when a selection changes */
  onSelectionChange: (itemId: string, value: string | undefined) => void;
  /** Placeholder text for unselected items */
  placeholder?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Label to show above the component */
  label?: string;
}

/**
 * A component that manages multiple select dropdowns with exclusive selection.
 * When a value is selected in one dropdown, it becomes unavailable in all other dropdowns.
 * This is useful for voting scenarios where each player can only receive one award.
 */
export function ExclusiveMultiSelect({
  items,
  options,
  selections,
  onSelectionChange,
  placeholder = "Select...",
  disabled = false,
  label,
}: ExclusiveMultiSelectProps) {
  // Get available options for a specific item (excluding already selected values)
  const getAvailableOptions = useMemo(() => {
    return (itemId: string): SelectOption[] => {
      const selectedValues = Object.entries(selections)
        .filter(([id, value]) => id !== itemId && value !== undefined)
        .map(([, value]) => value);

      return options.filter((option) => !selectedValues.includes(option.value));
    };
  }, [options, selections]);

  const handleClear = (itemId: string) => {
    onSelectionChange(itemId, undefined);
  };

  return (
    <YStack gap="$3">
      {label && (
        <Text fontSize="$4" fontWeight="600" color="$gray12">
          {label}
        </Text>
      )}
      {items.map((item) => {
        const availableOptions = getAvailableOptions(item.id);
        const currentValue = selections[item.id];
        const selectedOption = options.find((o) => o.value === currentValue);

        return (
          <Card
            key={item.id}
            padding="$3"
            backgroundColor="$background"
            borderColor="$gray6"
            borderWidth={1}
            borderRadius="$4"
          >
            <YStack gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <YStack flex={1}>
                  <Text fontSize="$3" fontWeight="600" color="$gray12">
                    {item.label}
                  </Text>
                  {item.description && (
                    <Text fontSize="$2" color="$gray10" fontStyle="italic">
                      {item.description}
                    </Text>
                  )}
                </YStack>
                {currentValue && (
                  <Button
                    size="$2"
                    circular
                    icon={X}
                    chromeless
                    onPress={() => handleClear(item.id)}
                    disabled={disabled}
                    opacity={disabled ? 0.5 : 1}
                  />
                )}
              </XStack>
              {Platform.OS === "web" ? (
                <WebExclusiveSelect
                  options={availableOptions}
                  value={currentValue}
                  placeholder={placeholder}
                  disabled={disabled}
                  onChange={(value) => onSelectionChange(item.id, value || undefined)}
                  selectedLabel={selectedOption?.label}
                />
              ) : (
                <Select
                  options={availableOptions}
                  value={currentValue}
                  placeholder={placeholder}
                  disabled={disabled}
                  onValueChange={(value) => onSelectionChange(item.id, value || undefined)}
                  searchable
                  searchPlaceholder="Search players..."
                />
              )}
            </YStack>
          </Card>
        );
      })}
    </YStack>
  );
}

// Web-specific select for exclusive selections
function WebExclusiveSelect({
  options,
  value,
  placeholder,
  disabled,
  onChange,
  selectedLabel,
}: {
  options: SelectOption[];
  value: string | undefined;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
  selectedLabel?: string;
}) {
  // Theme-aware CSS variables (Tamagui provides these as CSS custom properties)
  const cssVars = {
    background: "var(--background)",
    color: "var(--color)",
    borderColor: "var(--gray7)",
    placeholderColor: "var(--gray10)",
  };

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "12px",
        fontSize: "16px",
        borderRadius: "8px",
        border: `1px solid ${cssVars.borderColor}`,
        backgroundColor: cssVars.background,
        color: value ? cssVars.color : cssVars.placeholderColor,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        backgroundSize: "16px",
        paddingRight: "40px",
      }}
    >
      <option value="">{value ? `— ${placeholder} —` : placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export type { SelectionItem as VotingCriteriaItem };
