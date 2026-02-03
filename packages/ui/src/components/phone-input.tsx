import { useState, useCallback, useEffect } from "react";
import { Input as TamaguiInput, XStack, YStack, Text } from "tamagui";
import { Select } from "./Select";
import { COUNTRIES_WITH_DIAL_CODES, type CountryWithDialCode } from "../utils/country-flags";

export interface PhoneInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  value?: string;
  onChangeValue?: (fullPhone: string, isValid: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  defaultCountryCode?: string;
  searchPlaceholder?: string;
}

// Parse a full phone number into country code and local number
export function parsePhoneNumber(phone: string): {
  countryCode: string;
  dialCode: string;
  localNumber: string;
} {
  if (!phone) {
    return { countryCode: "DE", dialCode: "+49", localNumber: "" };
  }

  // Try to match against known dial codes (longest match first)
  const sortedCountries = [...COUNTRIES_WITH_DIAL_CODES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  for (const country of sortedCountries) {
    if (phone.startsWith(country.dialCode)) {
      return {
        countryCode: country.code,
        dialCode: country.dialCode,
        localNumber: phone.slice(country.dialCode.length),
      };
    }
  }

  // If no match and starts with +, try to extract prefix
  if (phone.startsWith("+")) {
    // Default to treating first 2-4 digits as country code
    const match = phone.match(/^(\+\d{1,4})(.*)$/);
    if (match) {
      return {
        countryCode: "DE",
        dialCode: match[1] || "+49",
        localNumber: match[2] || "",
      };
    }
  }

  // Default to Germany if no + prefix
  return { countryCode: "DE", dialCode: "+49", localNumber: phone };
}

// Validate phone number format
export function isValidPhoneNumber(phone: string): boolean {
  // International format: +[country code][number] with 7-15 digits total
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

// Get country by code
function getCountryByCode(code: string): CountryWithDialCode | undefined {
  return COUNTRIES_WITH_DIAL_CODES.find(
    (c) => c.code.toUpperCase() === code.toUpperCase()
  );
}

export function PhoneInput({
  label,
  error,
  helperText,
  value = "",
  onChangeValue,
  placeholder = "Phone number",
  disabled,
  defaultCountryCode = "DE",
  searchPlaceholder = "Search country...",
}: PhoneInputProps) {
  const parsed = parsePhoneNumber(value);
  const [countryCode, setCountryCode] = useState(
    parsed.localNumber ? parsed.countryCode : defaultCountryCode
  );
  const [localNumber, setLocalNumber] = useState(parsed.localNumber);

  // Sync state when value prop changes externally
  useEffect(() => {
    const parsed = parsePhoneNumber(value);
    if (value) {
      setCountryCode(parsed.countryCode || defaultCountryCode);
      setLocalNumber(parsed.localNumber);
    }
  }, [value, defaultCountryCode]);

  const getFullPhoneNumber = useCallback(
    (code: string, local: string) => {
      if (!local) return "";
      const country = getCountryByCode(code);
      const dialCode = country?.dialCode || "+49";
      // Remove any non-digit characters from local number
      const cleanLocal = local.replace(/\D/g, "");
      return `${dialCode}${cleanLocal}`;
    },
    []
  );

  const handleCountryChange = useCallback(
    (newCountryCode: string) => {
      setCountryCode(newCountryCode);
      const fullPhone = getFullPhoneNumber(newCountryCode, localNumber);
      onChangeValue?.(fullPhone, isValidPhoneNumber(fullPhone));
    },
    [localNumber, getFullPhoneNumber, onChangeValue]
  );

  const handleLocalNumberChange = useCallback(
    (newLocal: string) => {
      // Allow only digits
      const cleanLocal = newLocal.replace(/\D/g, "");
      setLocalNumber(cleanLocal);
      const fullPhone = getFullPhoneNumber(countryCode, cleanLocal);
      onChangeValue?.(fullPhone, isValidPhoneNumber(fullPhone));
    },
    [countryCode, getFullPhoneNumber, onChangeValue]
  );

  const selectedCountry = getCountryByCode(countryCode);

  // Create options for the Select component - show full info in dropdown
  const countryOptions = COUNTRIES_WITH_DIAL_CODES.map((country) => ({
    label: `${country.flag} ${country.dialCode} ${country.name}`,
    value: country.code,
  }));

  // Custom function to show only flag + dial code when selected
  const getSelectedLabel = (code: string) => {
    const country = getCountryByCode(code);
    return country ? `${country.flag} ${country.dialCode}` : "🇩🇪 +49";
  };

  return (
    <YStack gap="$2">
      {label && (
        <Text fontSize="$3" fontWeight="600" color="$gray12">
          {label}
        </Text>
      )}
      <XStack gap="$2">
        <YStack width={110}>
          <Select
            value={countryCode}
            onValueChange={handleCountryChange}
            options={countryOptions}
            searchable
            searchPlaceholder={searchPlaceholder}
            disabled={disabled}
            placeholder="🇩🇪 +49"
            getSelectedLabel={getSelectedLabel}
          />
        </YStack>
        <TamaguiInput
          flex={1}
          backgroundColor="$background"
          borderColor={error ? "$red8" : "$gray7"}
          borderWidth={1}
          borderRadius="$3"
          padding="$3"
          fontSize="$4"
          color="$gray12"
          placeholderTextColor="$gray9"
          placeholder={placeholder}
          value={localNumber}
          onChangeText={handleLocalNumberChange}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect="off"
          disabled={disabled}
          height={48}
          focusStyle={{
            borderColor: error ? "$red9" : "$blue9",
            outlineWidth: 0,
          }}
        />
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
