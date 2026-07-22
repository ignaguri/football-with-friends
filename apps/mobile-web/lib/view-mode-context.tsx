import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

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
 * Deliberately in-memory: the choice is asked once per session and resets when
 * the app restarts (on web, a page reload counts as a restart and returns the
 * user to `/mode`). Nothing is persisted, so there is no stale mode to
 * invalidate when a user's real role changes server-side.
 */
export type ViewMode = "player" | "organizer";

interface ViewModeContextValue {
  mode: ViewMode | null;
  setMode: (mode: ViewMode) => void;
  clearMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextValue | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode | null>(null);

  const setMode = useCallback((next: ViewMode) => setModeState(next), []);
  const clearMode = useCallback(() => setModeState(null), []);

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
