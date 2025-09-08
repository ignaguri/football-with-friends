"use client";

import { CalendarDownload } from "@/components/calendar-download";
import { capitalize } from "@/lib/utils";

import { ShareDrawer } from "./share-drawer";

interface MatchHeaderProps {
  matchTitle: string;
  matchMeta: { date: string; time: string };
  matchUrl: string;
  isShareDrawerOpen: boolean;
  onShareDrawerOpenChange: (open: boolean) => void;
  shareText: string;
}

export function MatchHeader({
  matchTitle,
  matchMeta,
  matchUrl,
  isShareDrawerOpen,
  onShareDrawerOpenChange,
  shareText,
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
          matchUrl={matchUrl}
          shareText={shareText}
        />
      </div>
      <h2 className="mt-2 break-words text-center text-2xl font-bold">
        {capitalize(matchTitle)}
      </h2>
    </div>
  );
}
