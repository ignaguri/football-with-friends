import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import { useSession } from "@repo/api-client";
import { api } from "@repo/api-client";

// Store the last registered token so we can unregister on logout
let _lastRegisteredToken: string | null = null;
let _notificationsConfigured = false;

/**
 * Lazily load expo-notifications to avoid crashing on builds
 * that don't include the native module yet.
 */
async function getNotificationsModule() {
  try {
    const Notifications = await import("expo-notifications");
    return Notifications;
  } catch {
    console.warn("expo-notifications native module not available");
    return null;
  }
}

async function configureNotificationHandler() {
  if (_notificationsConfigured) return;
  _notificationsConfigured = true;

  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

async function registerForPushNotifications(): Promise<string | null> {
  // Skip on web — web push will be added later
  if (Platform.OS === "web") return null;

  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;

  const Constants = (await import("expo-constants")).default;

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permissions not granted");
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    "fd683dbc-22ce-4809-b0be-8325693cd621";

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (error) {
    // APNs is not available on the simulator — this is expected
    console.log("Could not get push token:", error);
    return null;
  }
}

export function usePushNotifications() {
  const { data: session } = useSession();
  const registeredForUserRef = useRef<string | null>(null);
  const listenersRef = useRef<{ remove: () => void }[]>([]);

  useEffect(() => {
    // Skip on web
    if (Platform.OS === "web") return;

    // Reset when user changes (logout/login as different user)
    if (!session?.user) {
      registeredForUserRef.current = null;
      return;
    }

    // Only register once per user
    if (registeredForUserRef.current === session.user.id) return;

    registeredForUserRef.current = session.user.id;

    // Configure handler + register token
    configureNotificationHandler();

    registerForPushNotifications().then(async (token) => {
      if (!token) return;

      _lastRegisteredToken = token;

      try {
        await api.api["push-tokens"].$post({
          json: {
            token,
            platform: Platform.OS as "ios" | "android",
          },
        });
      } catch (error) {
        console.error("Failed to register push token:", error);
      }
    });

    // Set up listeners
    getNotificationsModule().then((Notifications) => {
      if (!Notifications) return;

      const notifSub = Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log(
            "Notification received:",
            notification.request.content.title,
          );
        },
      );

      const responseSub =
        Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data;
          if (data?.screen && typeof data.screen === "string") {
            router.push(data.screen as any);
          }
        });

      listenersRef.current = [notifSub, responseSub];
    });

    return () => {
      for (const sub of listenersRef.current) {
        sub.remove();
      }
      listenersRef.current = [];
    };
  }, [session?.user?.id]);
}

/**
 * Unregister the current push token. Call this before signing out.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!_lastRegisteredToken || Platform.OS === "web") return;

  try {
    await api.api["push-tokens"].$delete({
      json: { token: _lastRegisteredToken },
    });
  } catch (error) {
    console.error("Failed to unregister push token:", error);
  }

  _lastRegisteredToken = null;
}
