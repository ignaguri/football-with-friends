// Cloudflare Workers entry point for Hono API
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Import routes
import matchesRoute from "./routes/matches";
import courtsRoute from "./routes/courts";
import locationsRoute from "./routes/locations";
import profileRoute from "./routes/profile";
import settingsRoute from "./routes/settings";
import playersRoute from "./routes/players";

// Import auth - uses lazy initialization via Proxy for CF Workers compatibility
import { auth, resetAuth } from "./auth";

// Cloudflare Workers environment bindings
export type Bindings = {
  // Turso database
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  // Auth
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_BASE_URL?: string;
  // Google OAuth
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // CORS
  ALLOWED_ORIGINS?: string;
  TRUSTED_ORIGINS?: string;
  // Environment
  NODE_ENV?: string;
  DEFAULT_TIMEZONE?: string;
  STORAGE_PROVIDER?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware to inject environment variables into process.env
// This allows the shared package to work with Cloudflare Workers
app.use("*", async (c, next) => {
  // Set process.env from Cloudflare bindings
  // @ts-ignore - process.env may not exist in CF Workers but we polyfill it
  globalThis.process = globalThis.process || { env: {} };
  const env = c.env;

  // Copy all bindings to process.env
  Object.assign(process.env, {
    TURSO_DATABASE_URL: env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: env.TURSO_AUTH_TOKEN,
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    BETTER_AUTH_BASE_URL: env.BETTER_AUTH_BASE_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
    TRUSTED_ORIGINS: env.TRUSTED_ORIGINS,
    NODE_ENV: env.NODE_ENV || "production",
    DEFAULT_TIMEZONE: env.DEFAULT_TIMEZONE || "Europe/Berlin",
    STORAGE_PROVIDER: env.STORAGE_PROVIDER || "turso",
  });

  return next();
});

// Middleware
app.use("*", logger());
app.use("*", async (c, next) => {
  // Allow specific origins plus Vercel preview deployments
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:8081",
    "http://localhost:8085",
    "http://localhost:19006",
    "http://localhost:3000",
    "http://localhost:3001",
  ];

  const corsMiddleware = cors({
    origin: (origin) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return "*";

      // Allow listed origins
      if (allowedOrigins.includes(origin)) return origin;

      // Allow all Vercel preview deployments
      if (origin.endsWith(".vercel.app")) return origin;

      // Allow native app deep links
      if (origin.startsWith("football-with-friends://")) return origin;

      return null;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["set-auth-token"],
  });

  return corsMiddleware(c, next);
});

// Health check
app.get("/health", (c) =>
  c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    runtime: "cloudflare-workers",
  })
);

// Web OAuth callback - must be defined BEFORE the wildcard /api/auth/* route
// Extracts session token and redirects to web app with token in URL.
// This solves the cross-domain cookie problem: after OAuth, the session cookie is on CF Workers
// domain (same domain), so getSession() can read it. We then pass the token to Vercel via URL.
app.get("/api/auth/web-callback", async (c) => {
  const redirect = c.req.query("redirect");
  if (!redirect) {
    return c.json({ error: "Missing redirect parameter" }, 400);
  }

  try {
    // The session cookie is on the same CF Workers domain, so getSession() can read it
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

// Better Auth routes - uses lazy-initialized auth
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// API routes
app
  .basePath("/api")
  .route("/matches", matchesRoute)
  .route("/courts", courtsRoute)
  .route("/locations", locationsRoute)
  .route("/profile", profileRoute)
  .route("/settings", settingsRoute)
  .route("/players", playersRoute);

// Export for Cloudflare Workers
export default app;
