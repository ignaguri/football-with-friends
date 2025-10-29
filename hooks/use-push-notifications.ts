// Hook for managing push notifications

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  requestPermission: () => Promise<NotificationPermission>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    // Check if push notifications are supported
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription status:", error);
    }
  };

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      toast.error("Push notifications are not supported in this browser");
      return "denied";
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Failed to request notification permission");
      return "denied";
    }
  };

  const subscribe = async () => {
    if (!isSupported) {
      toast.error("Push notifications are not supported");
      return;
    }

    setIsLoading(true);

    try {
      // Request permission if not already granted
      let currentPermission = Notification.permission;
      if (currentPermission !== "granted") {
        currentPermission = await requestPermission();
        if (currentPermission !== "granted") {
          toast.error("Notification permission denied");
          return;
        }
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        await navigator.serviceWorker.ready;
      }

      // Get VAPID public key
      const vapidKeyResponse = await fetch("/api/push/vapid-key");
      if (!vapidKeyResponse.ok) {
        throw new Error("Failed to get VAPID public key");
      }
      const { publicKey } = await vapidKeyResponse.json();

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to subscribe to push notifications");
      }

      setIsSubscribed(true);
      toast.success("Push notifications enabled!");
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      toast.error("Failed to enable push notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) {
      return;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        toast.info("Not subscribed to push notifications");
        return;
      }

      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Notify server
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      setIsSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      toast.error("Failed to disable push notifications");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
