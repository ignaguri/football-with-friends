import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import i18n from "./i18n";

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get the appropriate date-fns locale based on current app language
 */
export function getLocale() {
  const currentLang = i18n.language;
  return currentLang === "es" ? es : enUS;
}

/**
 * Format a date with localization support
 * @param date - Date string or Date object
 * @param formatStr - date-fns format string (e.g., "dd.MM.yy", "EEEE")
 * @returns Formatted date string in current locale
 */
export function formatLocalizedDate(
  date: string | Date,
  formatStr: string,
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const locale = getLocale();
  return format(dateObj, formatStr, { locale });
}

/**
 * Format match date and time for list view
 * Format: DD.MM.YY · Day HH:MMhs
 * @param dateString - Date string (e.g., "2026-02-03")
 * @param timeString - Time string (e.g., "19:30")
 * @returns Combined formatted string
 */
export function formatMatchDateTime(
  dateString: string,
  timeString: string,
): string {
  const date = new Date(dateString);
  const locale = getLocale();

  const datePart = format(date, "dd.MM.yy");
  const dayPart = capitalizeFirst(format(date, "EEEE", { locale }));

  return `${datePart} · ${dayPart} ${timeString}hs`;
}

/**
 * Format a full date with day of week
 * @param dateString - Date string
 * @returns Formatted date like "Tuesday, February 3rd, 2026" or "Martes, 3 de febrero de 2026"
 */
export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  const locale = getLocale();
  const currentLang = i18n.language;

  // English uses ordinals: "Tuesday, February 3rd, 2026"
  // Spanish doesn't use ordinals: "Martes, 3 de febrero de 2026"
  const formatStr =
    currentLang === "es"
      ? "EEEE, d 'de' MMMM 'de' yyyy"
      : "EEEE, MMMM do, yyyy";

  const formatted = format(date, formatStr, { locale });
  return capitalizeFirst(formatted);
}

/**
 * Format a compact date
 * @param dateString - Date string
 * @returns Formatted date like "03.02.26"
 */
export function formatCompactDate(dateString: string): string {
  const date = new Date(dateString);
  return format(date, "dd.MM.yy");
}

/**
 * Get localized day of week
 * @param dateString - Date string
 * @returns Day of week in current locale (e.g., "Tuesday" or "Martes")
 */
export function getDayOfWeek(dateString: string): string {
  const date = new Date(dateString);
  const locale = getLocale();
  return capitalizeFirst(format(date, "EEEE", { locale }));
}
