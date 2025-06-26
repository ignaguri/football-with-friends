"use client";

import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

interface ShareDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShareWhatsApp: () => void;
  onCopyLink: () => void;
  copyButtonText: string;
}

export function ShareDrawer({
  open,
  onOpenChange,
  onShareWhatsApp,
  onCopyLink,
  copyButtonText,
}: ShareDrawerProps) {
  const t = useTranslations();
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("share.title")}
          className="ml-2"
        >
          <Share2 className="size-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("share.title")}</DrawerTitle>
          <DrawerDescription>{t("share.description")}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-3 px-4">
          <Button
            variant="secondary"
            className="w-full"
            onClick={onShareWhatsApp}
          >
            {t("share.whatsapp")}
          </Button>
          <Button variant="outline" className="w-full" onClick={onCopyLink}>
            {copyButtonText}
          </Button>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="ghost" className="w-full">
              {t("share.close")}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
