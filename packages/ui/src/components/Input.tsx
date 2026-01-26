import { useState } from "react";
import { Input as TamaguiInput, InputProps, YStack, XStack, Text } from "tamagui";
import { Eye, EyeOff } from "@tamagui/lucide-icons";
import { Pressable } from "react-native";

export interface CustomInputProps extends InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  showPasswordToggle?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  showPasswordToggle,
  secureTextEntry,
  ...props
}: CustomInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const isPassword = secureTextEntry || showPasswordToggle;
  const shouldHideText = isPassword && !isPasswordVisible;

  return (
    <YStack space="$2">
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
          paddingRight={isPassword ? "$10" : "$3"}
          fontSize="$4"
          color="$gray12"
          placeholderTextColor="$gray9"
          focusStyle={{
            borderColor: error ? "$red9" : "$blue9",
            outlineWidth: 0,
          }}
          secureTextEntry={shouldHideText}
          flex={1}
          {...props}
        />
        {isPassword && (
          <Pressable
            onPress={togglePasswordVisibility}
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
