/**
 * Country code to flag emoji and name utilities
 * Converts ISO 3166-1 alpha-2 country codes to flag emojis
 * Data from: https://github.com/risan/country-flag-emoji-json
 */

import countriesByCode from "../data/countries-by-code.json";
import countryDialCodes from "../data/country-dial-codes.json";

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string;
}

export interface CountryWithDialCode extends Country {
  dialCode: string;
}

interface CountryData {
  name: string;
  emoji: string;
  unicode: string;
  image: string;
}

/**
 * Convert ISO 3166-1 alpha-2 country code to flag emoji
 * @param countryCode - Two-letter country code (e.g., "US", "AR", "DE")
 * @returns Flag emoji string
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length < 2) {
    return "";
  }

  const upperCode = countryCode.toUpperCase();
  const countryData = (countriesByCode as Record<string, CountryData>)[upperCode];

  if (countryData) {
    return countryData.emoji;
  }

  // Fallback: generate flag emoji from country code
  // Formula: Unicode Regional Indicator base (0x1F1E6) + offset from 'A'
  const codePoints = upperCode
    .slice(0, 2)
    .split("")
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);

  return String.fromCodePoint(...codePoints);
}

/**
 * Get country name from country code
 * @param countryCode - Two-letter country code
 * @returns Country name or empty string if not found
 */
export function getCountryName(countryCode: string): string {
  const country = getCountry(countryCode);
  return country?.name || "";
}

/**
 * Get full country object from code
 * @param countryCode - Two-letter country code
 * @returns Country object or undefined if not found
 */
export function getCountry(countryCode: string): Country | undefined {
  if (!countryCode) return undefined;

  const upperCode = countryCode.toUpperCase();
  const countryData = (countriesByCode as Record<string, CountryData>)[upperCode];

  if (!countryData) return undefined;

  return {
    code: upperCode,
    name: countryData.name,
    flag: countryData.emoji,
  };
}

/**
 * List of all countries with codes, names, and flag emojis
 * Generated from country-flag-emoji-json dataset
 * Includes ~250 countries and territories
 */
export const COUNTRIES: Country[] = Object.entries(countriesByCode as Record<string, CountryData>)
  .map(([code, data]) => ({
    code,
    name: data.name,
    flag: data.emoji,
  }))
  .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name

/**
 * Validate if a country code exists in our list
 * @param countryCode - Two-letter country code
 * @returns True if country exists in our list
 */
export function isValidCountryCode(countryCode: string): boolean {
  if (!countryCode) return false;
  const upperCode = countryCode.toUpperCase();
  return upperCode in (countriesByCode as Record<string, CountryData>);
}

/**
 * Get dial code for a country
 * @param countryCode - Two-letter country code
 * @returns Dial code (e.g., "+49") or undefined if not found
 */
export function getCountryDialCode(countryCode: string): string | undefined {
  if (!countryCode) return undefined;
  const upperCode = countryCode.toUpperCase();
  return (countryDialCodes as Record<string, string>)[upperCode];
}

/**
 * Get country code from dial code
 * @param dialCode - Dial code (e.g., "+49" or "49")
 * @returns Country code or undefined if not found
 */
export function getCountryFromDialCode(dialCode: string): string | undefined {
  if (!dialCode) return undefined;
  const normalizedCode = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;

  // Find the country with this dial code
  const entry = Object.entries(countryDialCodes as Record<string, string>).find(
    ([, code]) => code === normalizedCode,
  );

  return entry?.[0];
}

/**
 * List of all countries with dial codes, sorted by name
 * For use in phone prefix selectors
 */
export const COUNTRIES_WITH_DIAL_CODES: CountryWithDialCode[] = Object.entries(
  countriesByCode as Record<string, CountryData>,
)
  .filter(([code]) => code in (countryDialCodes as Record<string, string>))
  .map(([code, data]) => ({
    code,
    name: data.name,
    flag: data.emoji,
    dialCode: (countryDialCodes as Record<string, string>)[code]!,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * List of unique dial codes with their primary country
 * Sorted by dial code for dropdown display
 */
export const DIAL_CODE_OPTIONS: CountryWithDialCode[] = (() => {
  // Create a map to get one country per dial code (prefer major countries)
  const dialCodeMap = new Map<string, CountryWithDialCode>();

  // Priority countries for shared dial codes
  const priorityCountries = ["US", "GB", "DE", "FR", "AU", "CA", "RU"];

  for (const country of COUNTRIES_WITH_DIAL_CODES) {
    const existing = dialCodeMap.get(country.dialCode);
    if (!existing || priorityCountries.includes(country.code)) {
      dialCodeMap.set(country.dialCode, country);
    }
  }

  return Array.from(dialCodeMap.values()).sort((a, b) => {
    // Sort by dial code numerically
    const aNum = parseInt(a.dialCode.replace("+", ""), 10);
    const bNum = parseInt(b.dialCode.replace("+", ""), 10);
    return aNum - bNum;
  });
})();
