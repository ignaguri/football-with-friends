import { fromZonedTime, formatInTimeZone, toZonedTime } from "date-fns-tz";

function getDefaultTimezone(): string {
  return process.env.DEFAULT_TIMEZONE || "Europe/Berlin";
}

export const DEFAULT_TIMEZONE = getDefaultTimezone();

export function convertToAppTimezone(date: Date | string, timezone?: string): Date {
  const targetTimezone = timezone || DEFAULT_TIMEZONE;
  return fromZonedTime(date, targetTimezone);
}

export function formatDateInAppTimezone(
  date: Date | string,
  format: string,
  timezone?: string,
): string {
  const targetTimezone = timezone || DEFAULT_TIMEZONE;
  return formatInTimeZone(date, targetTimezone, format);
}

export function convertFromAppTimezone(
  date: Date | string,
  timezone?: string,
): Date {
  const targetTimezone = timezone || DEFAULT_TIMEZONE;
  return toZonedTime(date, targetTimezone);
}

export function formatMatchDate(date: string, timezone?: string): string {
  return formatDateInAppTimezone(date, "yyyy-MM-dd", timezone);
}

export function formatMatchDateTime(
  date: string,
  time: string,
  timezone?: string,
): string {
  const targetTimezone = timezone || DEFAULT_TIMEZONE;
  const dateTimeString = `${date} ${time}`;
  return formatInTimeZone(
    `${dateTimeString}`,
    targetTimezone,
    "yyyy-MM-dd HH:mm:ss",
  );
}

export function formatDisplayDate(
  date: string | Date,
  format: string = "PPP",
  timezone?: string,
): string {
  return formatDateInAppTimezone(date, format, timezone);
}

export function formatDisplayDateTime(
  date: string,
  time: string,
  format: string = "PPP",
  timezone?: string,
): string {
  const targetTimezone = timezone || DEFAULT_TIMEZONE;
  const dateTimeString = `${date} ${time}`;
  return formatInTimeZone(dateTimeString, targetTimezone, format);
}

export function getAppTimezone(): string {
  return DEFAULT_TIMEZONE;
}