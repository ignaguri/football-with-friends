"use client";

import { Calendar as CalendarIcon } from "lucide-react";

import { ShareDrawer } from "./share-drawer";
import { Button } from "@/components/ui/button";
import { capitalize } from "@/lib/utils";

interface MatchHeaderProps {
  matchTitle: string;
  onAddToCalendar: () => void;
  isShareDrawerOpen: boolean;
  onShareDrawerOpenChange: (open: boolean) => void;
  onShareWhatsApp: () => void;
  onCopyLink: () => void;
  copyButtonText: string;
}

export function MatchHeader({
  matchTitle,
  onAddToCalendar,
  isShareDrawerOpen,
  onShareDrawerOpenChange,
  onShareWhatsApp,
  onCopyLink,
  copyButtonText,
}: MatchHeaderProps) {
  return (
    <div className="mb-4 flex flex-col items-stretch gap-2">
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Add to calendar"
          className="mr-1"
          onClick={onAddToCalendar}
        >
          <CalendarIcon className="size-5" />
        </Button>
        <ShareDrawer
          open={isShareDrawerOpen}
          onOpenChange={onShareDrawerOpenChange}
          onShareWhatsApp={onShareWhatsApp}
          onCopyLink={onCopyLink}
          copyButtonText={copyButtonText}
        />
      </div>
      <h2 className="mt-2 break-words text-center text-2xl font-bold">
        {capitalize(matchTitle)}
      </h2>
    </div>
  );
}
