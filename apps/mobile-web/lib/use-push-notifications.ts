import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import { useSession } from "@repo/api-client";
import { api } from "@repo/api-client";
import { getNotificationRoute } from "@repo/shared/utils";

// Tracks the token registered by this session so we can deactivate it on
// sign-out / account deletion. Set after a successful POST /push-tokens.
let _lastRegisteredToken: string | null = null;
let _notificationsConfigured = false;

export type OsPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "unsupported";

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

/**
 * Read the current OS-level permission status without prompting. Safe to call
 * on every mount — used by the preferences provider to reconcile UI state with
 * the device.
 */
export async function getOsPermissionStatus(): Promise<OsPermissionStatus> {
  if (Platform.OS === "web") return "unsupported";
  const Notifications = await getNotificationsModule();
  if (!Notifications) return "unsupported";

  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

/**
 * Trigger the native permission prompt (if not already decided), fetch the
 * Expo push token, and register it with the backend. Caller is responsible
 * for deciding *when* this runs — we never call it implicitly from a hook.
 *
 * Returns the OS status after the prompt and the token (null if denied or if
 * APNs is unavailable, e.g. on the iOS simulator).
 */
export async function requestAndRegister(): Promise<{
  status: OsPermissionStatus;
  token: string | null;
}> {
  if (Platform.OS === "web") return { status: "unsupported", token: null };

  const Notifications = await getNotificationsModule();
  if (!Notifications) return { status: "unsupported", token: null };

  const Constants = (await import("expo-constants")).default;

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus: string = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return { status: finalStatus === "denied" ? "denied" : "undetermined", token: null };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    "fd683dbc-22ce-4809-b0be-8325693cd621";

  let token: string | null = null;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    token = tokenData.data;
  } catch (error) {
    // APNs is not available on the simulator — expected in dev.
    console.log("Could not get push token:", error);
  }

  if (token) {
    try {
      await api.api["push-tokens"].$post({
        json: {
          token,
          platform: Platform.OS as "ios" | "android",
        },
      });
      _lastRegisteredToken = token;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Failed to register push token");
    }
  }

  return { status: "granted", token };
}

/**
 * Configures the foreground notification handler and attaches in-app
 * listeners for received notifications and tap-throughs. **Does not** request
 * permission or fetch a token — that's the responsibility of the
 * NotificationPreferencesProvider, which decides when to show the
 * pre-permission modal.
 */
export function usePushNotifications() {
  const { data: session } = useSession();
  const listenersAttachedRef = useRef(false);
  const listenersRef = useRef<{ remove: () => void }[]>([]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!session?.user) return;
    if (listenersAttachedRef.current) return;
    listenersAttachedRef.current = true;

    configureNotificationHandler();

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
          // Push notifications without a deep-link target (e.g. /send-test)
          // shouldn't navigate anywhere on tap — only follow an explicit
          // screen. Inbox-tap uses the helper's type-based fallback because
          // the user there always intended to open something.
          const screen =
            typeof data === "object" && data !== null
              ? (data as { screen?: unknown }).screen
              : undefined;
          if (typeof screen !== "string" || screen.length === 0) return;
          router.push(getNotificationRoute(data) as never);
        });

      listenersRef.current = [notifSub, responseSub];
    });

    return () => {
      for (const sub of listenersRef.current) {
        sub.remove();
      }
      listenersRef.current = [];
      listenersAttachedRef.current = false;
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

