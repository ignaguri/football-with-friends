import { useState } from "react";
import type { InputProps } from "tamagui";
import { Input as TamaguiInput, YStack, XStack, Text } from "tamagui";
import { Eye, EyeOff } from "@tamagui/lucide-icons-2";
import { Platform, Pressable } from "react-native";

export interface CustomInputProps extends InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  showPasswordToggle?: boolean;
  /** Hide the password visibility toggle even for secure text fields */
  hidePasswordToggle?: boolean;
  size?: string | number;
  /**
   * Accessible label for the password toggle in its "hidden" state.
   * Passed in by the caller because this package has no i18n context
   * (same pattern as `clearAccessibilityLabel` in ExclusiveMultiSelect).
   */
  showPasswordLabel?: string;
  /** Accessible label for the password toggle in its "visible" state. */
  hidePasswordLabel?: string;
}

export function Input({
  label,
  error,
  helperText,
  showPasswordToggle,
  hidePasswordToggle,
  secureTextEntry,
  showPasswordLabel = "Show password",
  hidePasswordLabel = "Hide password",
  ...props
}: CustomInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const isPassword = secureTextEntry || showPasswordToggle;
  const showToggle = isPassword && !hidePasswordToggle;
  const shouldHideText = isPassword && !isPasswordVisible;

  // The visible <Text> label is not programmatically associated with the input:
  // Tamagui gives us no id/htmlFor pairing, so the accessible name would fall
  // back to the placeholder. Reuse the visible label as the accessible name
  // unless the caller supplied one explicitly.
  const explicitLabel =
    props.accessibilityLabel ?? (props as Record<string, string | undefined>)["aria-label"];
  const a11yLabel = explicitLabel ?? label;

  const toggleLabel = isPasswordVisible ? hidePasswordLabel : showPasswordLabel;
  const toggleTestID = props.testID ? `${props.testID}-toggle` : undefined;

  return (
    <YStack gap="$2">
      {label && (
        <Text fontSize="$3" fontWeight="600" color="$gray12">
          {label}
        </Text>
      )}
      <XStack alignItems="center" position="relative">
        <TamaguiInput
          backgroundColor="$background"
          borderColor={error ? "$red8" : "$gray7"}
          borderWidth={1}
          padding="$3"
          paddingRight={showToggle ? "$10" : "$3"}
          fontSize="$4"
          color="$gray12"
          placeholderTextColor="$gray9"
          focusStyle={{
            borderColor: error ? "$red9" : "$blue9",
            outlineWidth: 0,
          }}
          secureTextEntry={shouldHideText}
          // Tamagui v2 doesn't map secureTextEntry to type="password" on web
          {...(Platform.OS === "web" && shouldHideText ? { type: "password" } : {})}
          flex={1}
          {...props}
          {...(a11yLabel
            ? {
                accessibilityLabel: a11yLabel,
                // Tamagui v2 doesn't map accessibilityLabel to aria-label on web
                ...(Platform.OS === "web" ? { "aria-label": a11yLabel } : {}),
              }
            : {})}
        />
        {showToggle && (
          <Pressable
            onPress={togglePasswordVisibility}
            accessibilityRole="button"
            accessibilityLabel={toggleLabel}
            accessibilityState={{ selected: isPasswordVisible }}
            testID={toggleTestID}
            hitSlop={8}
            style={{
              position: "absolute",
              right: 12,
              padding: 4,
            }}
          >
            {isPasswordVisible ? (
              <EyeOff size={20} color="$gray9" />
            ) : (
              <Eye size={20} color="$gray9" />
            )}
          </Pressable>
        )}
      </XStack>
      {error && (
        <Text fontSize="$2" color="$red10">
          {error}
        </Text>
      )}
      {helperText && !error && (
        <Text fontSize="$2" color="$gray10">
          {helperText}
        </Text>
      )}
    </YStack>
  );
}
