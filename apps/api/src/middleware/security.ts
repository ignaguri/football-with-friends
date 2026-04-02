import type { Context, Next } from "hono";
import type { User } from "@repo/shared/domain";
import { auth } from "../auth";

/**
 * Shared security types and middleware for the API.
 * Used by both worker.ts (Cloudflare Workers) and index.ts (Bun dev).
 */

// Session user stored in Hono context by the global auth middleware
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
};

// Hono app variables — use in Hono generic: Hono<{ Variables: AppVariables }>
export type AppVariables = { user: SessionUser };

// Convert session user to the full domain User type (with synthetic timestamps)
export function sessionUserToUser(sessionUser: SessionUser): User {
  return {
    ...sessionUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Routes that bypass the global auth middleware
export const PUBLIC_ROUTES: Array<{ method?: string; path: RegExp }> = [
  { path: /^\/api\/auth\// },                                      // BetterAuth
  { path: /^\/api\/phone-auth\// },                                 // Phone auth
  { path: /^\/api\/matches\/[^/]+\/preview$/, method: "GET" },      // OG metadata preview
  { path: /^\/api\/profile\/picture\//, method: "GET" },            // Served images
  { path: /^\/health$/ },                                           // Health check
  { path: /^\/api\/cron\//, method: "POST" },                       // Cron (has own secret check)
];

// Global auth middleware — secure by default.
// All /api/* routes require a valid session unless explicitly allowlisted above.
export async function authMiddleware(c: Context, next: Next) {
  const { method } = c.req;
  const path = new URL(c.req.url).pathname;

  const isPublic = PUBLIC_ROUTES.some(
    (r) => r.path.test(path) && (!r.method || r.method === method)
  );
  if (isPublic) return next();

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name || "",
    role: ((session.user as any).role as "user" | "admin") || "user",
  });
  return next();
}

// In-memory rate limiter (per-isolate/process, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const MAX_REQUESTS = 10;
const WINDOW_MS = 60_000;
const CLEANUP_THRESHOLD = 10_000;

function checkRateLimit(key: string, now: number): number | null {
  const entry = rateLimitMap.get(key);
  if (entry && entry.resetAt > now && entry.count >= MAX_REQUESTS) {
    return Math.ceil((entry.resetAt - now) / 1000);
  }
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
  if (rateLimitMap.size > CLEANUP_THRESHOLD) {
    for (const [k, v] of rateLimitMap) {
      if (v.resetAt <= now) rateLimitMap.delete(k);
    }
  }
  return null;
}

// Extracts the client IP from request headers
function getClientIp(c: Context): string {
  return c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
}

// Rate limiter middleware factory for auth endpoints
export function rateLimitMiddleware(keyPrefix?: string) {
  return async (c: Context, next: Next) => {
    const ip = getClientIp(c);
    const key = keyPrefix ? `${keyPrefix}:${ip}` : ip;
    const retryAfter = checkRateLimit(key, Date.now());
    if (retryAfter !== null) {
      return c.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    }
    return next();
  };
}
