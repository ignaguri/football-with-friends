import { DEFAULT_TIMEZONE } from "@repo/shared/utils";
import { addHours } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import * as Calendar from "expo-calendar";
import { Platform, Linking } from "react-native";

export function getGoogleCalendarUrl(params: {
  date: string;
  time: string;
  matchTitle: string;
  matchUrl?: string;
  location?: string;
}): string {
  const dateTimeString = `${params.date} ${params.time}`;

  const startDate = formatInTimeZone(dateTimeString, DEFAULT_TIMEZONE, "yyyyMMdd");
  const startTime = formatInTimeZone(dateTimeString, DEFAULT_TIMEZONE, "HHmm");

  const startDateTime = fromZonedTime(`${dateTimeString}:00`, DEFAULT_TIMEZONE);
  const end = addHours(startDateTime, 1);
  const endDate = formatInTimeZone(end, DEFAULT_TIMEZONE, "yyyyMMdd");
  const endTime = formatInTimeZone(end, DEFAULT_TIMEZONE, "HHmm");

  const defaultLocation = "Soccerarena @https://maps.app.goo.gl/CsABKszfiMpJ7eaZA";
  const locationParam = params.location || defaultLocation;

  const description = params.matchUrl ? `${params.matchTitle}\n${params.matchUrl}` : params.matchTitle;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(params.matchTitle)}&dates=${startDate}T${startTime}00/${endDate}T${endTime}00&details=${encodeURIComponent(description)}&location=${encodeURIComponent(locationParam)}`;
}

export function openGoogleCalendar(url: string): void {
  if (typeof window !== "undefined") {
    window.open(url, "_blank");
  } else {
    Linking.openURL(url).catch((err) => {
      console.error("Failed to open Google Calendar:", err);
    });
  }
}

export async function openSystemCalendarEventEditor(params: {
  date: string;
  time: string;
  title: string;
  notes?: string;
  location?: string;
}): Promise<void> {
  if (Platform.OS === "web") return;

  const dateTimeString = `${params.date} ${params.time}`;
  const startDate = fromZonedTime(`${dateTimeString}:00`, DEFAULT_TIMEZONE);
  const endDate = addHours(startDate, 1);

  await Calendar.createEventInCalendarAsync({
    title: params.title,
    startDate,
    endDate,
    location: params.location,
    notes: params.notes,
    timeZone: DEFAULT_TIMEZONE,
  });
}
