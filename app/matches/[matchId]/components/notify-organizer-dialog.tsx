import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NotifyOrganizerDialogProps {
  displayDate: string;
  userName: string;
}

export function NotifyOrganizerDialog({
  displayDate,
  userName,
}: NotifyOrganizerDialogProps) {
  const t = useTranslations();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="bg-green-600 px-3 py-1 text-white hover:bg-green-700"
        >
          {t("notify.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="notify-organizer">
        <DialogHeader>
          <DialogTitle>{t("notify.title")}</DialogTitle>
        </DialogHeader>
        <DialogFooter className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_ORGANIZER_WHATSAPP}?text=${encodeURIComponent(
              t("notify.whatsappMessage", {
                date: displayDate,
                name: userName,
              }),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button variant="default" className="w-full">
              {t("notify.send")}
            </Button>
          </a>
          <DialogClose asChild>
            <Button variant="outline" className="w-full">
              {t("notify.sent")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
