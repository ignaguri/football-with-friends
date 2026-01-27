import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { auth } from "./auth";
import matchesRoute from "./routes/matches";
import courtsRoute from "./routes/courts";
import locationsRoute from "./routes/locations";
import profileRoute from "./routes/profile";
import settingsRoute from "./routes/settings";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:8081",
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

// Web OAuth callback - must be defined BEFORE the wildcard /api/auth/* route
// Extracts session token and redirects to web app with token in URL
app.get("/api/auth/web-callback", async (c) => {
  const redirect = c.req.query("redirect");
  if (!redirect) {
    return c.json({ error: "Missing redirect parameter" }, 400);
  }

  try {
    // The session cookie is on the same domain, so getSession() can read it
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (session?.session?.token) {
      const url = new URL(redirect);
      // Pass the raw session token — the bearer plugin looks up this token directly
      url.searchParams.set("session_token", session.session.token);
      return c.redirect(url.toString());
    }
  } catch (error) {
    console.error("web-callback error:", error);
  }

  // Fallback: redirect without token (user will see sign-in page)
  return c.redirect(redirect);
});

// Better Auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// API routes
const apiRoutes = app
  .basePath("/api")
  .route("/matches", matchesRoute)
  .route("/courts", courtsRoute)
  .route("/locations", locationsRoute)
  .route("/profile", profileRoute)
  .route("/settings", settingsRoute);

const port = process.env.PORT || 3001;

console.log(`🚀 API Server running on http://localhost:${port}`);

// Export type for RPC client
export type ApiRoutes = typeof apiRoutes;

export default {
  port,
  fetch: app.fetch,
};
