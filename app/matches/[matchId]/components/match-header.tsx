"use client";

import { ShareDrawer } from "./share-drawer";
import { CalendarDownload } from "@/components/calendar-download";

interface MatchHeaderProps {
  matchTitle: string;
  matchMeta: { date: string; time: string };
  matchUrl: string;
  isShareDrawerOpen: boolean;
  onShareDrawerOpenChange: (open: boolean) => void;
  onShareWhatsApp: () => void;
  onCopyLink: () => void;
  copyButtonText: string;
}

export function MatchHeader({
  matchTitle,
  matchMeta,
  matchUrl,
  isShareDrawerOpen,
  onShareDrawerOpenChange,
  onShareWhatsApp,
  onCopyLink,
  copyButtonText,
}: MatchHeaderProps) {
  return (
    <div className="mb-4 flex flex-col items-stretch gap-2">
      <div className="flex justify-end gap-2">
        <CalendarDownload
          matchMeta={matchMeta}
          matchTitle={matchTitle}
          matchUrl={matchUrl}
        />
        <ShareDrawer
          open={isShareDrawerOpen}
          onOpenChange={onShareDrawerOpenChange}
          onShareWhatsApp={onShareWhatsApp}
          onCopyLink={onCopyLink}
          copyButtonText={copyButtonText}
        />
      </div>
      <h2 className="mt-2 break-words text-center text-2xl font-bold">
        {matchTitle}
      </h2>
    </div>
  );
}
