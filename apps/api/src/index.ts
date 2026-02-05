import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { auth } from "./auth";
import matchesRoute from "./routes/matches";
import courtsRoute from "./routes/courts";
import locationsRoute from "./routes/locations";
import profileRoute from "./routes/profile";
import settingsRoute from "./routes/settings";
import playersRoute from "./routes/players";
import cronRoute from "./routes/cron";
import phoneAuthRoute from "./routes/phone-auth";
import votingRoute from "./routes/voting";
import rankingsRoute from "./routes/rankings";

const app = new Hono();

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

// Health check
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

// Custom OAuth callback interceptor for web - extracts session and passes token to frontend
// This handles the cross-domain session token passing for localhost development
app.get("/api/auth/callback/google", async (c) => {
  console.log("[OAUTH-CALLBACK] 🔵 Intercepting Google OAuth callback");

  // Let BetterAuth process the OAuth callback first
  const response = await auth.handler(c.req.raw);

  // If it's a redirect (successful OAuth)
  if (response.status === 302) {
    const redirectUrl = response.headers.get("location");
    console.log("[OAUTH-CALLBACK] 🎯 Original redirect:", redirectUrl);

    // Try to get the session that was just created
    // We need to extract the session cookie from the response
    const setCookie = response.headers.get("set-cookie");
    console.log("[OAUTH-CALLBACK] 🍪 Set-Cookie header:", setCookie);

    // Parse session token from set-cookie header
    let sessionToken: string | null = null;
    if (setCookie) {
      const sessionCookieMatch = setCookie.match(/better-auth\.session_token=([^;]+)/);
      if (sessionCookieMatch) {
        sessionToken = sessionCookieMatch[1] ?? null;
        console.log("[OAUTH-CALLBACK] ✅ Found session token in cookie");
      }
    }

    if (sessionToken && redirectUrl) {
      // Add session token to redirect URL
      // Handle relative URLs by using request origin as base
      let fullRedirectUrl: string;
      if (redirectUrl.startsWith("http://") || redirectUrl.startsWith("https://")) {
        fullRedirectUrl = redirectUrl;
      } else {
        // For relative URLs, use the Origin header or Referer to build full URL
        const origin = c.req.header("origin") || c.req.header("referer")?.replace(/\/[^/]*$/, "") || "http://localhost:8084";
        fullRedirectUrl = origin + (redirectUrl.startsWith("/") ? redirectUrl : "/" + redirectUrl);
      }

      const url = new URL(fullRedirectUrl);
      url.searchParams.set("session_token", sessionToken);
      console.log("[OAUTH-CALLBACK] ➡️ Redirecting with token to:", url.toString());

      return c.redirect(url.toString());
    } else {
      console.warn("[OAUTH-CALLBACK] ⚠️ No session token found, using original redirect");
    }
  }

  // Return the original response if not a redirect or no token found
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
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
const apiRoutes = app
  .basePath("/api")
  .route("/matches", matchesRoute)
  .route("/courts", courtsRoute)
  .route("/locations", locationsRoute)
  .route("/profile", profileRoute)
  .route("/settings", settingsRoute)
  .route("/players", playersRoute)
  .route("/rankings", rankingsRoute)
  .route("/cron", cronRoute)
  .route("/phone-auth", phoneAuthRoute)
  .route("/voting", votingRoute);

const port = process.env.PORT || 3001;

console.log(`🚀 API Server running on http://localhost:${port}`);

// Export type for RPC client
export type ApiRoutes = typeof apiRoutes;

export default {
  port,
  fetch: app.fetch,
};
