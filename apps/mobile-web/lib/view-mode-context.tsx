import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";

/**
 * Session-scoped view mode, chosen on the `/mode` screen after sign-in.
 *
 * IMPORTANT — this is a *view preference*, never a permission.
 *
 * Authorization lives on the server (`apps/api/src/middleware/authz.ts`,
 * scoped by the `X-Group-Id` header) and in `group_members.role`. The mode can
 * only ever NARROW what a user sees: picking "organizer" shows organizer UI
 * *where the user already holds that role*, and picking "player" hides it even
 * from real organizers. It cannot grant anything — a client-side grant would
 * just render admin UI whose every request the API rejects.
 *
 * On native, this resets when the app restarts, which is expected. On web, a
 * page reload used to count as a restart too and bounced the user back to
 * `/mode` on every refresh, so the choice is mirrored to `sessionStorage`
 * there: it survives reloads within the tab but still clears on tab close,
 * so there is no long-lived stale mode to invalidate when a user's real role
 * changes server-side.
 */
export type ViewMode = "player" | "organizer";

const STORAGE_KEY = "fwf-view-mode";

function isViewMode(value: unknown): value is ViewMode {
  return value === "player" || value === "organizer";
}

function readStoredMode(): ViewMode | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  return isViewMode(stored) ? stored : null;
}

interface ViewModeContextValue {
  mode: ViewMode | null;
  setMode: (mode: ViewMode) => void;
  clearMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextValue | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode | null>(readStoredMode);

  const setMode = useCallback((next: ViewMode) => {
    setModeState(next);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const clearMode = useCallback(() => {
    setModeState(null);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo(() => ({ mode, setMode, clearMode }), [mode, setMode, clearMode]);

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    throw new Error("useViewMode must be used inside a ViewModeProvider");
  }
  return ctx;
}
