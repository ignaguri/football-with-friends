"use client";

import { Button } from "@/components/ui/button";

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
  return (
    <div className="mt-8 flex w-full flex-col justify-center gap-2 rounded-lg border bg-card p-4 text-card-foreground shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="text-center md:text-left">
        <h2 className="text-xl font-bold">
          {isPlayerInMatch ? "You're in!" : "Want to play?"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isPlayerInMatch
            ? "You can cancel your spot or sign up a guest below."
            : spotsLeft > 0
              ? `${spotsLeft} spot${spotsLeft > 1 ? "s" : ""} left!`
              : "Match is full!"}
        </p>
      </div>

      {user && !isPlayerInMatch && !isCancelled && (
        <Button onClick={onJoin} disabled={isSigningUp || spotsLeft < 1}>
          {isSigningUp ? "Joining..." : "Join Match"}
        </Button>
      )}

      {user && isPlayerInMatch && (
        <div className="flex flex-col gap-2 md:flex-row">
          <Button
            onClick={onCancel}
            disabled={isSigningUp}
            variant="destructive"
          >
            {isSigningUp ? "Cancelling..." : "Cancel my spot"}
          </Button>
          <Button
            onClick={onAddGuest}
            disabled={isSigningUp || spotsLeft < 1}
            variant="secondary"
          >
            Sign up a guest
          </Button>
        </div>
      )}

      {user && isCancelled && (
        <p className="text-center font-medium text-destructive md:text-right">
          You have cancelled your spot.
        </p>
      )}
    </div>
  );
}
