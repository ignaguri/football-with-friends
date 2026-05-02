// @ts-nocheck - Tamagui type recursion workaround

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  type NotificationPreferences,
  type NotificationPreferencesUpdate,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useSession,
} from "@repo/api-client";

import {
  type OsPermissionStatus,
  getOsPermissionStatus,
  requestAndRegister,
} from "../use-push-notifications";

const PROMPT_SHOWN_KEY = "notif-prompt-shown-v1";

export type NotificationCategoryKey = "pushNewMatch" | "pushMatchReminder" | "pushPromoToConfirmed";

interface NotificationPreferencesContextValue {
  osStatus: OsPermissionStatus;
  prefs: NotificationPreferences | undefined;
  isLoading: boolean;
  hasShownPrompt: boolean;
  /** True when both OS perm is granted and master push_enabled is on. */
  effectivelyEnabled: boolean;
  refreshOsStatus: () => Promise<void>;
  /** Record that the user saw the pitch — regardless of accept/skip. */
  markPromptShown: () => Promise<void>;
  /**
   * Run the OS permission request, register the token, and flip backend
   * push_enabled to true. Throws on failure so callers can show an error.
   */
  enableMaster: () => Promise<{ status: OsPermissionStatus }>;
  /** Just flip backend push_enabled to false. Leaves OS permission and token alone. */
  disableMaster: () => Promise<void>;
  /** Set a single per-category preference. */
  setCategory: (category: NotificationCategoryKey, value: boolean) => Promise<void>;
}

const NotificationPreferencesContext = createContext<NotificationPreferencesContextValue | null>(
  null,
);

export function NotificationPreferencesProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user);

  const [osStatus, setOsStatus] = useState<OsPermissionStatus>(
    Platform.OS === "web" ? "unsupported" : "undetermined",
  );
  const [hasShownPrompt, setHasShownPrompt] = useState(false);
  // Track AsyncStorage hydration so callers don't read `hasShownPrompt`
  // before the prompt-shown flag has been loaded — otherwise the home-screen
  // effect pops the prompt on every cold start.
  const [initLoaded, setInitLoaded] = useState(Platform.OS === "web");

  const prefsQuery = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  const refreshOsStatus = useCallback(async () => {
    const next = await getOsPermissionStatus();
    setOsStatus((prev) => (prev === next ? prev : next));
  }, []);

  // Native only: read OS state + prompt-shown flag in parallel and reconcile
  // OS state on every foreground. Web has no expo-notifications module and
  // no AppState concept worth reacting to.
  useEffect(() => {
    if (Platform.OS === "web") return;

    Promise.all([getOsPermissionStatus(), AsyncStorage.getItem(PROMPT_SHOWN_KEY)])
      .then(([status, shown]) => {
        setOsStatus(status);
        setHasShownPrompt(shown === "1");
      })
      .catch(() => {
        // Init failure is non-fatal — keep defaults and try again on next mount/foreground.
      })
      .finally(() => {
        setInitLoaded(true);
      });

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshOsStatus().catch(() => {});
    });
    return () => sub.remove();
  }, [refreshOsStatus]);

  const markPromptShown = useCallback(async () => {
    setHasShownPrompt(true);
    await AsyncStorage.setItem(PROMPT_SHOWN_KEY, "1");
  }, []);

  const patch = useCallback(
    async (update: NotificationPreferencesUpdate) => {
      await updateMutation.mutateAsync(update);
    },
    [updateMutation],
  );

  const enableMaster = useCallback(async () => {
    const result = await requestAndRegister();
    setOsStatus((prev) => (prev === result.status ? prev : result.status));
    if (result.status === "granted") {
      // Even if APNs gave us no token (simulator), the backend toggle still
      // makes sense — a real device on the same account will receive.
      await patch({ pushEnabled: true });
    }
    return { status: result.status };
  }, [patch]);

  const disableMaster = useCallback(async () => {
    await patch({ pushEnabled: false });
  }, [patch]);

  const setCategory = useCallback(
    async (category: NotificationCategoryKey, value: boolean) => {
      await patch({ [category]: value } as NotificationPreferencesUpdate);
    },
    [patch],
  );

  const effectivelyEnabled = osStatus === "granted" && Boolean(prefsQuery.data?.pushEnabled);

  const value = useMemo<NotificationPreferencesContextValue>(
    () => ({
      osStatus,
      prefs: prefsQuery.data,
      isLoading: !isAuthed || prefsQuery.isLoading || !initLoaded,
      hasShownPrompt,
      effectivelyEnabled,
      refreshOsStatus,
      markPromptShown,
      enableMaster,
      disableMaster,
      setCategory,
    }),
    [
      osStatus,
      prefsQuery.data,
      prefsQuery.isLoading,
      isAuthed,
      initLoaded,
      hasShownPrompt,
      refreshOsStatus,
      markPromptShown,
      enableMaster,
      disableMaster,
      setCategory,
    ],
  );

  return (
    <NotificationPreferencesContext.Provider value={value}>
      {children}
    </NotificationPreferencesContext.Provider>
  );
}

export function useNotificationPreferencesContext() {
  const ctx = useContext(NotificationPreferencesContext);
  if (!ctx) {
    throw new Error(
      "useNotificationPreferencesContext must be used within a NotificationPreferencesProvider",
    );
  }
  return ctx;
}
