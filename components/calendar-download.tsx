import { Button } from "@/components/ui/button";
import { parse, addHours } from "date-fns";
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
    const startDate = matchMeta.date.replace(/-/g, "");
    const startTime = matchMeta.time.replace(":", "");
    const startDateTime = parse(
      `${matchMeta.date} ${matchMeta.time}`,
      "yyyy-MM-dd HH:mm",
      new Date(),
    );
    const end = addHours(startDateTime, 1);
    const endDate = end.toISOString().slice(0, 10).replace(/-/g, "");
    const endTime = end.toTimeString().slice(0, 5).replace(":", "");
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
