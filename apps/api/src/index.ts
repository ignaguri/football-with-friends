import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { auth } from "./auth";
import { registerApiRoutes } from "./api-routes";
import { type AppVariables, authMiddleware, rateLimitMiddleware } from "./middleware/security";

const app = new Hono<{ Variables: AppVariables }>();

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
    allowHeaders: ["Content-Type", "Authorization", "X-Group-Id"],
    exposeHeaders: ["set-auth-token", "X-Group-Id"],
  }),
);

// Rate limiting for auth endpoints
app.use("/api/auth/*", rateLimitMiddleware());
app.use("/api/phone-auth/*", rateLimitMiddleware("phone"));

// Global auth middleware
app.use("/api/*", authMiddleware);

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

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
        const origin =
          c.req.header("origin") ||
          c.req.header("referer")?.replace(/\/[^/]*$/, "") ||
          "http://localhost:8084";
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
  console.log("[OAUTH-CALLBACK] Intercepting Google OAuth callback");
  return interceptOAuthCallback(c);
});

app.post("/api/auth/callback/apple", async (c) => {
  console.log("[OAUTH-CALLBACK] Intercepting Apple OAuth callback");
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
