import type { Context } from "hono";

export function fireAndForget(c: Context, promise: Promise<unknown>): void {
  try {
    c.executionCtx.waitUntil(promise);
  } catch {
    promise.catch((err) => console.error("[fireAndForget]", err));
  }
}
