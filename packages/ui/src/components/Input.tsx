import { Input as TamaguiInput, InputProps, YStack, Text } from "tamagui";

export interface CustomInputProps extends InputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  ...props
}: CustomInputProps) {
  return (
    <YStack space="$2">
      {label && (
        <Text fontSize="$3" fontWeight="600" color="$gray12">
          {label}
        </Text>
      )}
      <TamaguiInput
        backgroundColor="$background"
        borderColor={error ? "$red8" : "$gray7"}
        borderWidth={1}
        padding="$3"
        fontSize="$4"
        color="$gray12"
        placeholderTextColor="$gray9"
        focusStyle={{
          borderColor: error ? "$red9" : "$blue9",
          outlineWidth: 0,
        }}
        {...props}
      />
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
