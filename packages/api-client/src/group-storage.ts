// Persists the user's active group id across app launches. Read path is sync
// via an in-memory cache; boot is gated by `_groupIdLoadPromise` (mirrors the
// bearer-token boot gate in `auth.ts`).
//
// The server is the source of truth: if the client sends no `X-Group-Id`,
// `groupContextMiddleware` picks the user's oldest-joined group and echoes
// it back on the response. `recordGroupIdFromResponse` captures that echo
// so the next request is already scoped.

import { GROUP_HEADER } from "@repo/shared/domain";
import { hydrateFromStorage, storage } from "./storage";

const STORAGE_KEY = "football_active_group_id";

let _cachedGroupId: string | null = null;

export const _groupIdLoadPromise: Promise<void> = hydrateFromStorage(STORAGE_KEY).then((id) => {
  if (id) _cachedGroupId = id;
});

export function getActiveGroupId(): string | null {
  return _cachedGroupId;
}

export function setActiveGroupId(id: string | null): void {
  if (id === _cachedGroupId) return;
  _cachedGroupId = id;
  try {
    if (id) storage.setItem(STORAGE_KEY, id);
    else void storage.deleteItem(STORAGE_KEY);
  } catch {
    // Persistence is best-effort; the in-memory cache remains authoritative.
  }
}

/**
 * Updates the cached group id from a server response's `X-Group-Id` header,
 * if it differs from what we've got. Called on every response by the fetch
 * interceptor so first-boot auto-picks and post-switcher updates persist.
 */
export function recordGroupIdFromResponse(response: Response): void {
  const echoed = response.headers.get(GROUP_HEADER);
  if (echoed && echoed !== _cachedGroupId) {
    setActiveGroupId(echoed);
  }
}

export { GROUP_HEADER };
