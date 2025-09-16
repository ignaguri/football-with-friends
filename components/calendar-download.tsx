import { Button } from "@/components/ui/button";
import { DEFAULT_TIMEZONE } from "@/lib/utils/timezone";
import { addHours } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { useTranslations } from "next-intl";

interface CalendarDownloadProps {
  matchMeta: {
    date: string;
    time: string;
  };
  matchTitle: string;
  matchUrl: string;
  buttonClassName?: string;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isSafari() {
  return (
    /Safari/.test(navigator.userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|mercury/.test(navigator.userAgent)
  );
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

function getGoogleCalendarUrl({
  startDate,
  startTime,
  endDate,
  endTime,
  matchTitle,
  matchUrl,
}: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  matchTitle: string;
  matchUrl: string;
}) {
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Fulbito&dates=${startDate}T${startTime}00/${endDate}T${endTime}00&details=Football match - ${matchTitle}%5Cn${matchUrl}&location=Soccarena%20@https://maps.app.goo.gl/CsABKszfiMpJ7eaZA`;
}

export function CalendarDownload({
  matchMeta,
  matchTitle,
  matchUrl,
  buttonClassName,
}: CalendarDownloadProps) {
  const t = useTranslations();

  function handleAddToCalendar() {
    if (!matchMeta?.date || !matchMeta?.time) return;

    // Create datetime string in Berlin timezone
    const dateTimeString = `${matchMeta.date} ${matchMeta.time}`;

    // Format start date and time for calendar
    const startDate = formatInTimeZone(
      dateTimeString,
      DEFAULT_TIMEZONE,
      "yyyyMMdd",
    );
    const startTime = formatInTimeZone(
      dateTimeString,
      DEFAULT_TIMEZONE,
      "HHmm",
    );

    // Calculate end time (1 hour later)
    const startDateTime = fromZonedTime(
      `${dateTimeString}:00`,
      DEFAULT_TIMEZONE,
    );
    const end = addHours(startDateTime, 1);
    const endDate = formatInTimeZone(end, DEFAULT_TIMEZONE, "yyyyMMdd");
    const endTime = formatInTimeZone(end, DEFAULT_TIMEZONE, "HHmm");
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${startDate}T${startTime}00`,
      `DTEND:${endDate}T${endTime}00`,
      `SUMMARY:Fulbito`,
      `DESCRIPTION:Football match - ${matchTitle}`,
      `LOCATION:Soccarena @https://maps.app.goo.gl/CsABKszfiMpJ7eaZA`,
      `URL:${matchUrl}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    if (isIOS() && !isSafari()) {
      if (window.confirm(t("shared.iosSafari"))) {
        window.open(
          getGoogleCalendarUrl({
            startDate,
            startTime,
            endDate,
            endTime,
            matchTitle,
            matchUrl,
          }),
          "_blank",
        );
      }
      return;
    }

    if (isAndroid()) {
      const blob = new Blob([icsContent], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `football-match-${matchMeta.date}.ics`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      return;
    }

    // Desktop or iOS Safari: default .ics download
    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `football-match-${matchMeta.date}.ics`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={t("shared.addToCalendar")}
      className={buttonClassName}
      onClick={handleAddToCalendar}
    >
      <svg
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    </Button>
  );
}
