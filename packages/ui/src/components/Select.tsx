import { useState, useRef, useEffect } from "react";
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
  /** Custom function to get the display label when a value is selected (shorter than full option label) */
  getSelectedLabel?: (value: string) => string;
}

// Web-specific custom select with search support
function WebSelect({
  label,
  error,
  options,
  placeholder = "Select an option",
  value,
  onValueChange,
  disabled,
  searchable = false,
  searchPlaceholder = "Search...",
  getSelectedLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = searchable && searchQuery
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Get display label for selected value
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = value
    ? getSelectedLabel
      ? getSelectedLabel(value)
      : selectedOption?.label || placeholder
    : placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue);
    setIsOpen(false);
    setSearchQuery("");
  };

  // Theme-aware CSS variables (Tamagui provides these as CSS custom properties)
  const cssVars = {
    background: "var(--background)",
    color: "var(--color)",
    borderColor: "var(--gray7)",
    placeholderColor: "var(--gray10)",
    hoverBg: "var(--gray4)",
    selectedBg: "var(--gray5)",
    accentColor: "var(--blue10)",
  };

  return (
    <YStack gap="$2" zIndex={isOpen ? 10000 : "auto"}>
      {label && (
        <Text fontSize="$3" fontWeight="600" color="$gray12">
          {label}
        </Text>
      )}
      <div ref={containerRef} style={{ position: "relative", zIndex: isOpen ? 10000 : "auto" }}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            borderRadius: "8px",
            border: error ? "1px solid var(--red8)" : `1px solid ${cssVars.borderColor}`,
            backgroundColor: cssVars.background,
            color: value ? cssVars.color : cssVars.placeholderColor,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            textAlign: "left",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayLabel}
          </span>
          <ChevronDown size={16} color={cssVars.color} style={{ flexShrink: 0, marginLeft: 8 }} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: "4px",
              backgroundColor: cssVars.background,
              border: `1px solid ${cssVars.borderColor}`,
              borderRadius: "8px",
              boxShadow: "var(--shadow6)",
              zIndex: 10000,
              maxHeight: "300px",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {/* Search input */}
            {searchable && (
              <div style={{ padding: "8px", borderBottom: `1px solid ${cssVars.borderColor}`, boxSizing: "border-box" }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    fontSize: "14px",
                    border: `1px solid ${cssVars.borderColor}`,
                    borderRadius: "4px",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    backgroundColor: cssVars.background,
                    color: cssVars.color,
                  }}
                />
              </div>
            )}

            {/* Options list */}
            <div style={{ overflow: "auto", maxHeight: "250px" }}>
              {filteredOptions.length === 0 ? (
                <div style={{
                  padding: "12px",
                  color: cssVars.placeholderColor,
                  textAlign: "center",
                  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}>
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      backgroundColor: option.value === value ? cssVars.selectedBg : "transparent",
                      color: cssVars.color,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      fontSize: "14px",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLDivElement).style.backgroundColor = cssVars.hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLDivElement).style.backgroundColor =
                        option.value === value ? cssVars.selectedBg : "transparent";
                    }}
                  >
                    <span>{option.label}</span>
                    {option.value === value && <Check size={16} color={cssVars.accentColor} />}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
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
  getSelectedLabel,
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

  // Create renderValue function if getSelectedLabel is provided
  const renderValue = getSelectedLabel
    ? (val: string) => getSelectedLabel(val)
    : undefined;

  return (
    <YStack gap="$2">
      {label && (
        <Text fontSize="$3" fontWeight="600" color="$gray12">
          {label}
        </Text>
      )}
      <TamaguiSelect {...props} renderValue={renderValue}>
        <TamaguiSelect.Trigger
          backgroundColor="$background"
          borderColor={error ? "$red8" : "$gray7"}
          borderWidth={1}
          borderRadius="$3"
          padding="$3"
          height={48}
          iconAfter={ChevronDown}
          opacity={disabled ? 0.5 : 1}
          disabled={disabled}
        >
          <TamaguiSelect.Value placeholder={placeholder} />
        </TamaguiSelect.Trigger>

        <Adapt platform="touch">
          <Sheet
            modal
            dismissOnSnapToBottom
            snapPointsMode="fit"
          >
            <Sheet.Frame backgroundColor="$background" paddingTop={top} paddingLeft={left} paddingRight={right}>
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
              // @ts-expect-error Tamagui RC: animation types need config augmentation
              animation="lazy"
              backgroundColor="rgba(0, 0, 0, 0.5)"
              enterStyle={{ opacity: 0 }}
              exitStyle={{ opacity: 0 }}
            />
          </Sheet>
        </Adapt>

        {/* @ts-expect-error Tamagui RC: zIndex prop not in Content type but works at runtime */}
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
