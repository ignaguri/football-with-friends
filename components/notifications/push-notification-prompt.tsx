"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Bell, BellOff, X } from "lucide-react";
import { useEffect, useState } from "react";

interface PushNotificationPromptProps {
  onDismiss?: () => void;
}

export function PushNotificationPrompt({
  onDismiss,
}: PushNotificationPromptProps) {
  const { isSupported, isSubscribed, isLoading, permission, subscribe } =
    usePushNotifications();

  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed this prompt
    const dismissed = localStorage.getItem(
      "push-notification-prompt-dismissed",
    );
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("push-notification-prompt-dismissed", "true");
    onDismiss?.();
  };

  const handleEnableNotifications = async () => {
    await subscribe();
    handleDismiss();
  };

  // Don't show if:
  // - Already dismissed
  // - Already subscribed
  // - Permission denied
  // - Not supported
  if (isDismissed || isSubscribed || permission === "denied" || !isSupported) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="relative pb-3">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Stay Updated</CardTitle>
        </div>
        <CardDescription>
          Get notified about upcoming matches, player changes, and important
          updates
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="text-primary">•</span>
            Match reminders (24h, 2h, 30min before)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">•</span>
            Player join/leave notifications
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">•</span>
            Match updates and cancellations
          </li>
        </ul>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          onClick={handleEnableNotifications}
          disabled={isLoading}
          className="flex-1"
        >
          <Bell className="mr-2 h-4 w-4" />
          {isLoading ? "Enabling..." : "Enable Notifications"}
        </Button>
        <Button variant="outline" onClick={handleDismiss} disabled={isLoading}>
          Not Now
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PushNotificationBanner() {
  const { isSupported, isSubscribed, isLoading, permission, subscribe } =
    usePushNotifications();

  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(
      "push-notification-banner-dismissed",
    );
    if (dismissed === "true") {
      setIsClosed(true);
    }
  }, []);

  const handleClose = () => {
    setIsClosed(true);
    localStorage.setItem("push-notification-banner-dismissed", "true");
  };

  const handleEnable = async () => {
    await subscribe();
    handleClose();
  };

  if (isClosed || isSubscribed || permission === "denied" || !isSupported) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 border-b bg-primary/90 backdrop-blur-sm">
      <div className="container flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary-foreground" />
          <div>
            <p className="text-sm font-medium text-primary-foreground">
              Enable push notifications
            </p>
            <p className="text-xs text-primary-foreground/80">
              Never miss a match reminder or update
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleEnable}
            disabled={isLoading}
          >
            {isLoading ? "Enabling..." : "Enable"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PushNotificationToggle() {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <BellOff className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Push Notifications</p>
            <p className="text-xs text-muted-foreground">
              Not supported in this browser
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5" />
        <div>
          <p className="text-sm font-medium">Push Notifications</p>
          <p className="text-xs text-muted-foreground">
            {isSubscribed
              ? "You'll receive match updates and reminders"
              : "Enable to get notified about your matches"}
          </p>
        </div>
      </div>
      <Button
        variant={isSubscribed ? "outline" : "default"}
        size="sm"
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : isSubscribed ? "Disable" : "Enable"}
      </Button>
    </div>
  );
}
