import { clsx, type ClassValue } from "clsx";
import { parse } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatMatchTitle(
  date?: string,
  time?: string,
  locale?: string | string[],
): string | undefined {
  if (!date || !time) return undefined;
  try {
    // Use date-fns to parse 'yyyy-MM-dd HH:mm'
    const dateTimeString = `${date} ${time}`;
    let dateObj = parse(dateTimeString, "yyyy-MM-dd HH:mm", new Date());
    if (isNaN(dateObj.getTime())) {
      // Fallback to native Date if parse fails
      dateObj = new Date(`${date}T${time}`);
      if (isNaN(dateObj.getTime())) return undefined;
    }
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(dateObj);
  } catch {
    return undefined;
  }
}
