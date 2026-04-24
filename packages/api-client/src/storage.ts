// Platform-split persistent storage adapter.
//
// IMPORTANT: `getItem` and `setItem` MUST be synchronous on native because
// BetterAuth's expoClient plugin calls them without awaiting (e.g.
// `getCookie(storage.getItem(key))`). Using async here would silently break
// cookie injection — `getCookie(Promise)` parses as an empty object.
//
// - native: `expo-secure-store` (sync .getItem / .setItem)
// - web:    AsyncStorage is async; we cache hydrated values in memory at boot
//           so subsequent reads are sync.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const storage = {
  getItem(key: string): string | null {
    if (Platform.OS === "web") {
      // expoClient skips cookie injection on web (has `if (isWeb) return` checks),
      // so this is only called for bearer-token loading which handles async
      // separately via `hydrateFromStorage`.
      return null;
    }
    return SecureStore.getItem(key);
  },
  setItem(key: string, value: string): void {
    if (Platform.OS === "web") {
      AsyncStorage.setItem(key, value);
      return;
    }
    SecureStore.setItem(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

/**
 * Async hydration for web (AsyncStorage is async) / sync read for native.
 * Use this once at module boot to cache a value into a module-level variable
 * before sync `getItem` calls are issued.
 */
export async function hydrateFromStorage(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return (await AsyncStorage.getItem(key)) ?? null;
    }
    return SecureStore.getItem(key);
  } catch {
    return null;
  }
}
