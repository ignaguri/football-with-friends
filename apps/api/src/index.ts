import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { auth } from "./auth";
import { registerApiRoutes } from "./api-routes";

type SessionUser = { id: string; email: string; name: string; role: string };

const app = new Hono<{ Variables: { user: SessionUser } }>();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:8081",
      "http://localhost:8084",
      "http://localhost:8085",
      "http://localhost:19006",
      "http://localhost:3000",
    ],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["set-auth-token"],
  })
);

// Rate limiting for auth endpoints (per-process, resets on restart)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, now: number): boolean {
  const entry = rateLimitMap.get(key);
  if (entry && entry.resetAt > now && entry.count >= 10) return true;
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
  } else {
    entry.count++;
  }
  if (rateLimitMap.size > 10_000) {
    for (const [k, v] of rateLimitMap) {
      if (v.resetAt <= now) rateLimitMap.delete(k);
    }
  }
  return false;
}

app.use("/api/auth/*", async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || "unknown";
  if (checkRateLimit(ip, Date.now())) {
    return c.json({ error: "Too many requests" }, 429);
  }
  return next();
});

app.use("/api/phone-auth/*", async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || "unknown";
  if (checkRateLimit(`phone:${ip}`, Date.now())) {
    return c.json({ error: "Too many requests" }, 429);
  }
  return next();
});

// Global auth middleware — secure by default
// Only explicitly allowlisted routes are public; everything else requires a valid session.
const PUBLIC_ROUTES: Array<{ method?: string; path: RegExp }> = [
  { path: /^\/api\/auth\// },                                      // BetterAuth
  { path: /^\/api\/phone-auth\// },                                 // Phone auth
  { path: /^\/api\/matches\/[^/]+\/preview$/, method: "GET" },      // OG metadata preview
  { path: /^\/api\/profile\/picture\//, method: "GET" },            // Served images
  { path: /^\/health$/ },                                           // Health check
  { path: /^\/api\/cron\//, method: "POST" },                       // Cron (has own secret check)
];

app.use("/api/*", async (c, next) => {
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
    role: ((session.user as any).role as string) || "user",
  });
  return next();
});

// Health check
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

// Reusable helper: intercept an OAuth callback, extract session token and append to redirect URL
async function interceptOAuthCallback(c: any) {
  const response = await auth.handler(c.req.raw);

  if (response.status === 302) {
    const redirectUrl = response.headers.get("location");
    const setCookie = response.headers.get("set-cookie");

    let sessionToken: string | null = null;
    if (setCookie) {
      const sessionCookieMatch = setCookie.match(/better-auth\.session_token=([^;]+)/);
      if (sessionCookieMatch) {
        sessionToken = sessionCookieMatch[1] ?? null;
      }
    }

    if (sessionToken && redirectUrl) {
      let fullRedirectUrl: string;
      if (redirectUrl.startsWith("http://") || redirectUrl.startsWith("https://")) {
        fullRedirectUrl = redirectUrl;
      } else {
        const origin = c.req.header("origin") || c.req.header("referer")?.replace(/\/[^/]*$/, "") || "http://localhost:8084";
        fullRedirectUrl = origin + (redirectUrl.startsWith("/") ? redirectUrl : "/" + redirectUrl);
      }

      const url = new URL(fullRedirectUrl);
      url.searchParams.set("session_token", sessionToken);
      return c.redirect(url.toString());
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

// Custom OAuth callback interceptors - extract session token and append to redirect URL
// Handles cross-domain session token passing (Vercel frontend ↔ Cloudflare Workers API)
app.get("/api/auth/callback/google", async (c) => {
  console.log("[OAUTH-CALLBACK] 🔵 Intercepting Google OAuth callback");
  return interceptOAuthCallback(c);
});

app.post("/api/auth/callback/apple", async (c) => {
  console.log("[OAUTH-CALLBACK] 🍎 Intercepting Apple OAuth callback");
  return interceptOAuthCallback(c);
});

// Better Auth routes - wrap to filter cookies and avoid expo client infinite refetch bug
// See: https://github.com/better-auth/better-auth/issues/4744
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  const path = c.req.path;
  console.log(`[AUTH] ${c.req.method} ${path}`);

  const response = await auth.handler(c.req.raw);

  // Log redirects
  if (response.status === 302 || response.status === 301) {
    console.log(`[AUTH] → Redirect ${response.status} to:`, response.headers.get("location"));
  }

  // Filter Set-Cookie headers to only include better-auth cookies
  const setCookieHeader = response.headers.get("set-cookie");
  if (setCookieHeader) {
    // Create new headers without the original set-cookie
    const newHeaders = new Headers(response.headers);
    newHeaders.delete("set-cookie");

    // Filter to only include better-auth related cookies
    const cookies = setCookieHeader.split(/,(?=\s*[^;]+=[^;]+)/).filter((cookie) => {
      const cookieName = cookie.trim().split("=")[0]?.toLowerCase() ?? "";
      return (
        cookieName.startsWith("better-auth") ||
        cookieName === "session_token" ||
        cookieName.includes("auth")
      );
    });

    if (cookies.length > 0) {
      newHeaders.set("set-cookie", cookies.join(", "));
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  return response;
});

// API routes
registerApiRoutes(app);

const port = process.env.PORT || 3001;

console.log(`🚀 API Server running on http://localhost:${port}`);

// Re-export type for RPC client
export type { ApiRoutes } from "./api-routes";

export default {
  port,
  fetch: app.fetch,
};
