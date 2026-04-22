// Persists the user's active group id across app launches and provides a
// synchronous read path for the request interceptor in client.ts.
//
// The server is the source of truth: if the client sends no `X-Group-Id`,
// groupContextMiddleware picks the user's oldest-joined group and echoes
// it back on the response header. The app-side `recordGroupIdFromResponse`
// hook below watches every response and persists the echoed id so the next
// request is already scoped.
//
// Platform parity:
//   - native: expo-secure-store (sync read/write via .getItem / .setItem)
//   - web:    AsyncStorage (async); we cache the value in memory and hydrate
//             once on app boot, so subsequent reads are sync.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEY = "football_active_group_id";
const GROUP_HEADER = "X-Group-Id";

let _cachedGroupId: string | null = null;

export const _groupIdLoadPromise: Promise<void> = Promise.resolve().then(async () => {
  try {
    if (Platform.OS === "web") {
      const id = await AsyncStorage.getItem(STORAGE_KEY);
      if (id) _cachedGroupId = id;
    } else {
      const id = SecureStore.getItem(STORAGE_KEY);
      if (id) _cachedGroupId = id;
    }
  } catch {
    // Ignore storage errors during boot — the server will pick a fallback.
  }
});

export function getActiveGroupId(): string | null {
  return _cachedGroupId;
}

export function setActiveGroupId(id: string | null): void {
  _cachedGroupId = id;
  try {
    if (Platform.OS === "web") {
      if (id) AsyncStorage.setItem(STORAGE_KEY, id);
      else AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      if (id) SecureStore.setItem(STORAGE_KEY, id);
      else SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch {
    // Persistence is best-effort; the in-memory cache is the fallback.
  }
}

/**
 * Updates the active group id from a server response's `X-Group-Id` header.
 * Called by the fetch interceptor on every response so the client stays in
 * sync when groupContextMiddleware auto-picks a group for us.
 */
export function recordGroupIdFromResponse(response: Response): void {
  const echoed = response.headers.get(GROUP_HEADER);
  if (echoed && echoed !== _cachedGroupId) {
    setActiveGroupId(echoed);
  }
}

export { GROUP_HEADER };
