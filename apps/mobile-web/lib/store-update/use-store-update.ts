// apps/mobile-web/lib/store-update/use-store-update.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DISMISSED_KEY = "store-update:dismissed-version";
const FOREGROUND_RECHECK_MS = 6 * 60 * 60 * 1000; // 6h

type ServerResponse = {
  ios: { version: string; buildNumber: number; storeUrl: string };
  android: { version: string; versionCode: number; storeUrl: string };
};

type State = {
  available: boolean;
  latestVersion: string | null;
  storeUrl: string | null;
};

const INITIAL: State = { available: false, latestVersion: null, storeUrl: null };

function pickPlatform(payload: ServerResponse) {
  if (Platform.OS === "ios") {
    return { latestCounter: payload.ios.buildNumber, version: payload.ios.version, storeUrl: payload.ios.storeUrl };
  }
  if (Platform.OS === "android") {
    return { latestCounter: payload.android.versionCode, version: payload.android.version, storeUrl: payload.android.storeUrl };
  }
  return null;
}

export function useStoreUpdate(apiUrl: string | undefined) {
  const [state, setState] = useState<State>(INITIAL);
  const lastCheckedRef = useRef<number>(0);

  const check = useCallback(async () => {
    // Native + non-dev only. Web auto-updates; dev is too noisy.
    if (Platform.OS === "web" || __DEV__) return;
    if (!apiUrl) return;

    try {
      const localBuildRaw = Application.nativeBuildVersion;
      if (!localBuildRaw) return;
      const localCounter = Number.parseInt(localBuildRaw, 10);
      if (!Number.isFinite(localCounter)) return;

      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/api/app-version`);
      if (!res.ok) return;
      const payload = (await res.json()) as ServerResponse;
      const picked = pickPlatform(payload);
      if (!picked) return;

      lastCheckedRef.current = Date.now();

      if (picked.latestCounter <= localCounter) {
        setState({ available: false, latestVersion: picked.version, storeUrl: picked.storeUrl });
        return;
      }

      let dismissedVersion: string | null = null;
      try {
        dismissedVersion = await AsyncStorage.getItem(DISMISSED_KEY);
      } catch {
        // Treat unreadable storage as "not dismissed".
      }

      const available = dismissedVersion !== picked.version;
      setState({ available, latestVersion: picked.version, storeUrl: picked.storeUrl });
    } catch {
      // Silent fail — best-effort, same philosophy as the OTA check.
    }
  }, [apiUrl]);

  // Initial check on mount.
  useEffect(() => {
    void check();
  }, [check]);

  // Re-check when app returns to foreground after long idle.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      if (Date.now() - lastCheckedRef.current < FOREGROUND_RECHECK_MS) return;
      void check();
    });
    return () => sub.remove();
  }, [check]);

  const dismiss = useCallback(async () => {
    if (!state.latestVersion) return;
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, state.latestVersion);
    } catch {
      // Best-effort: even if write fails, hide for this session.
    }
    setState((prev) => ({ ...prev, available: false }));
  }, [state.latestVersion]);

  return { ...state, dismiss };
}
