"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
}

interface MatchActionsProps {
  user: User | undefined;
  isPlayerInMatch: boolean;
  isCancelled: boolean;
  spotsLeft: number;
  isSigningUp: boolean;
  onJoin: () => void;
  onCancel: () => void;
  onAddGuest: () => void;
}

export function MatchActions({
  user,
  isPlayerInMatch,
  isCancelled,
  spotsLeft,
  isSigningUp,
  onJoin,
  onCancel,
  onAddGuest,
}: MatchActionsProps) {
  const t = useTranslations();
  return (
    <div className="mt-8 flex w-full flex-col justify-center gap-2 rounded-lg border bg-card p-4 text-card-foreground shadow-xs md:flex-row md:items-center md:justify-between">
      <div className="text-center md:text-left">
        <h2 className="text-xl font-bold">
          {isPlayerInMatch ? t("actions.in") : t("actions.wantToPlay")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isPlayerInMatch
            ? t("actions.cancelOrGuest")
            : spotsLeft > 0
              ? t("actions.spotsLeft", { count: spotsLeft })
              : t("actions.matchFull")}
        </p>
      </div>

      {user && !isPlayerInMatch && !isCancelled && (
        <Button onClick={onJoin} disabled={isSigningUp || spotsLeft < 1}>
          {isSigningUp ? t("actions.joining") : t("actions.join")}
        </Button>
      )}

      {user && isPlayerInMatch && (
        <div className="flex flex-col gap-2 md:flex-row">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isSigningUp} variant="destructive">
                {isSigningUp ? t("actions.cancelling") : t("actions.cancel")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("actions.cancel")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("actions.cancelOrGuest")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("shared.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={onCancel}>
                  {t("actions.cancel")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            onClick={onAddGuest}
            disabled={isSigningUp || spotsLeft < 1}
            variant="secondary"
          >
            {t("actions.signUpGuest")}
          </Button>
        </div>
      )}

      {user && isCancelled && (
        <p className="text-center font-medium text-destructive md:text-right">
          {t("actions.cancelled")}
        </p>
      )}
    </div>
  );
}
