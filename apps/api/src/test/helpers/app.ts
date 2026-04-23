// Mini Hono app factory for middleware-level tests.
//
// We deliberately skip BetterAuth (too much setup for a test harness): instead
// a tiny inject-user middleware is mounted *before* groupContextMiddleware so
// `requireUser(c)` in the middleware under test returns whatever persona the
// test asked for. This is the same ctx shape production uses — we just wire
// the "who is the caller" side differently.

import { Hono } from "hono";
import type { Context, Next } from "hono";

import type { AppVariables, SessionUser } from "../../middleware/security";
import { groupContextMiddleware } from "../../middleware/group-context";

export interface MiniAppOptions {
  /** Called for every test request; return the fake session user or null. */
  resolveUser: (c: Context) => SessionUser | null;
}

/**
 * Build a Hono app that mounts `groupContextMiddleware` on `/scoped` plus a
 * trivial handler that echoes the resolved group. Any 403/404/409 response
 * comes straight from the middleware under test.
 */
export function makeMiniApp(options: MiniAppOptions) {
  const app = new Hono<{ Variables: AppVariables }>();

  // Test-only: inject a fake session user. Replaces BetterAuth for tests.
  app.use("*", async (c: Context, next: Next) => {
    const user = options.resolveUser(c);
    if (user) c.set("user", user);
    return next();
  });

  app.use("/scoped/*", groupContextMiddleware);

  app.get("/scoped/echo", (c) => {
    const current = c.get("currentGroup");
    return c.json({ ok: true, currentGroup: current });
  });

  return app;
}

/** Request helper — builds a Request with the `X-Group-Id` header pre-set. */
export function makeRequest(
  path: string,
  opts: { groupId?: string; method?: string } = {},
): Request {
  const headers = new Headers();
  if (opts.groupId) headers.set("X-Group-Id", opts.groupId);
  return new Request(`http://test.local${path}`, {
    method: opts.method ?? "GET",
    headers,
  });
}
