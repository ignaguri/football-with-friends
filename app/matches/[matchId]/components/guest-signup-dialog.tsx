"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";

const guestSchema = z.object({
  guestName: z.string().max(50, "Name too long").optional(),
});
type GuestFormValues = z.infer<typeof guestSchema>;

interface GuestSignupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddGuest: (guestName?: string) => void;
  isSubmitting: boolean;
  playerCount: number;
}

export function GuestSignupDialog({
  open,
  onOpenChange,
  onAddGuest,
  isSubmitting,
  playerCount,
}: GuestSignupDialogProps) {
  const t = useTranslations();
  const guestForm = useForm<GuestFormValues>({
    resolver: zodResolver(guestSchema),
    defaultValues: { guestName: "" },
  });

  function handleSubmit(data: GuestFormValues) {
    onAddGuest(data.guestName);
    guestForm.reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          guestForm.reset();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("guest.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={guestForm.handleSubmit(handleSubmit)}>
          <div className="mb-2">
            <label
              htmlFor="guest-name"
              className="mb-1 block text-sm font-medium"
            >
              {t("guest.label")}
            </label>
            <Input
              id="guest-name"
              {...guestForm.register("guestName")}
              placeholder={t("guest.placeholder")}
              disabled={isSubmitting}
            />
            {guestForm.formState.errors.guestName && (
              <p className="text-xs text-red-600">{t("guest.nameTooLong")}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || playerCount >= 10}>
              {isSubmitting ? t("guest.adding") : t("guest.add")}
            </Button>
            <DialogClose asChild>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  guestForm.reset();
                  onOpenChange(false);
                }}
              >
                {t("shared.cancel")}
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
