"use client";

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
import { useToast } from "@/hooks/use-toast";
import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface ShareDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchUrl: string;
  shareText: string;
}

export function ShareDrawer({
  open,
  onOpenChange,
  matchUrl,
  shareText,
}: ShareDrawerProps) {
  const t = useTranslations();
  const { toast: showToast } = useToast();
  const [copyButtonText, setCopyButtonText] = useState(t("share.copyLink"));

  function handleShareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
    );
  }

  function handleCopyLink() {
    if (typeof window === "undefined") return;
    navigator.clipboard
      .writeText(matchUrl)
      .then(() => {
        setCopyButtonText(t("share.copied"));
        showToast({
          title: t("share.linkCopied"),
          description: t("matchDetail.shareAnywhere"),
        });
        setTimeout(() => setCopyButtonText(t("share.copyLink")), 2000);
      })
      .catch(() => {
        showToast({
          variant: "destructive",
          title: t("matchDetail.error"),
          description: t("matchDetail.copyFailed"),
        });
      });
  }

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
            onClick={handleShareWhatsApp}
          >
            {t("share.whatsapp")}
          </Button>
          <Button variant="outline" className="w-full" onClick={handleCopyLink}>
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
