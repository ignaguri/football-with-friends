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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="bg-green-600 px-3 py-1 text-white hover:bg-green-700"
        >
          I paid
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="notify-organizer">
        <DialogHeader>
          <DialogTitle>
            If you already paid, you can notify the organizer via WhatsApp
          </DialogTitle>
        </DialogHeader>
        <DialogFooter className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <a
            href={`https://wa.me/4917662232065?text=${encodeURIComponent(
              `Hola! Ya pagué mi partido para el ${displayDate} - ${userName}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button variant="default" className="w-full">
              Send WhatsApp message
            </Button>
          </a>
          <DialogClose asChild>
            <Button variant="outline" className="w-full">
              I already sent the message
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
