// Cloudflare Workers entry point for Hono API
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as Sentry from "@sentry/cloudflare";

// Import shared route registrations
import { registerApiRoutes } from "./api-routes";

// Import auth - uses lazy initialization via Proxy for CF Workers compatibility
import { auth } from "./auth";

// Import cron jobs
import { updateMatchStatuses } from "./cron/update-match-statuses";
import { sendMatchReminders } from "./cron/send-match-reminders";
import { sendEngagementReminders } from "./cron/send-engagement-reminders";

// Import shared security middleware
import { type AppVariables, authMiddleware, rateLimitMiddleware } from "./middleware/security";

/** Extract session token from a cookie header string (Set-Cookie or Cookie). */
function extractSessionToken(header: string): string | null {
  const match =
    header.match(/__Secure-better-auth\.session_token=([^;]+)/) ||
    header.match(/better-auth\.session_token=([^;]+)/);
  return match?.[1] ?? null;
}

/** Inject Cloudflare Worker bindings into process.env for shared package compatibility. */
function injectEnv(env: Bindings) {
  // @ts-ignore - process.env may not exist in CF Workers but we polyfill it
  globalThis.process = globalThis.process || { env: {} };
  Object.assign(process.env, {
    TURSO_DATABASE_URL: env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: env.TURSO_AUTH_TOKEN,
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    BETTER_AUTH_BASE_URL: env.BETTER_AUTH_BASE_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    APPLE_CLIENT_ID: env.APPLE_CLIENT_ID,
    APPLE_CLIENT_SECRET: env.APPLE_CLIENT_SECRET,
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
    TRUSTED_ORIGINS: env.TRUSTED_ORIGINS,
    NODE_ENV: env.NODE_ENV || "production",
    DEFAULT_TIMEZONE: env.DEFAULT_TIMEZONE || "Europe/Berlin",
    STORAGE_PROVIDER: env.STORAGE_PROVIDER || "turso",
    CRON_SECRET: env.CRON_SECRET,
    EXPO_ACCESS_TOKEN: env.EXPO_ACCESS_TOKEN,
  });
}

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
  // Apple Sign In (optional)
  APPLE_CLIENT_ID?: string;
  APPLE_CLIENT_SECRET?: string;
  // CORS
  ALLOWED_ORIGINS?: string;
  TRUSTED_ORIGINS?: string;
  // Environment
  NODE_ENV?: string;
  DEFAULT_TIMEZONE?: string;
  STORAGE_PROVIDER?: string;
  // Cron
  CRON_SECRET?: string;
  // Monitoring
  SENTRY_DSN?: string;
  // Push notifications
  EXPO_ACCESS_TOKEN?: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

app.use("*", async (c, next) => {
  injectEnv(c.env);
  return next();
});

// Middleware
app.use("*", logger());
app.use("*", async (c, next) => {
  // Allow specific origins plus Vercel preview deployments
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:8081",
    "http://localhost:8084",
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

      // Allow project-specific Vercel preview deployments
      if (/^https:\/\/football-with-friends(-[a-z0-9-]+)?(-ignacio-guris-projects)?\.vercel\.app$/.test(origin)) return origin;

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

// Rate limiting for auth endpoints
app.use("/api/auth/*", rateLimitMiddleware());
app.use("/api/phone-auth/*", rateLimitMiddleware("phone"));

// Global auth middleware
app.use("/api/*", authMiddleware);

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

    const cookieHeader = c.req.header("cookie") || "";
    const rawCookieToken = extractSessionToken(cookieHeader);

    let decodedCookieToken = rawCookieToken;
    if (rawCookieToken) {
      try {
        // Cookies are URL-encoded; decode to avoid double-encoding in query params.
        decodedCookieToken = decodeURIComponent(rawCookieToken);
      } catch {
        decodedCookieToken = rawCookieToken;
      }
    }

    const candidateTokens = [
      session?.session?.token ?? null,
      decodedCookieToken,
      rawCookieToken,
    ].filter((token): token is string => Boolean(token));

    let sessionToken: string | null = null;
    for (const token of candidateTokens) {
      const verifiedSession = await auth.api.getSession({
        headers: new Headers({ authorization: `Bearer ${token}` }),
      });
      if (verifiedSession?.session?.token) {
        sessionToken = token;
        break;
      }
    }

    if (sessionToken) {
      const url = new URL(redirect);
      // Pass the raw session token — the bearer plugin looks up this token directly
      url.searchParams.set("session_token", sessionToken);
      return c.redirect(url.toString());
    }
  } catch (error) {
    console.error("web-callback error:", error);
  }

  // Fallback: redirect without token (user will see sign-in page)
  return c.redirect(redirect);
});

// Better Auth routes - uses lazy-initialized auth
// Wrap to filter cookies and avoid expo client infinite refetch bug
// See: https://github.com/better-auth/better-auth/issues/4744
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  const path = new URL(c.req.url).pathname;
  const response = await auth.handler(c.req.raw);

  // Workaround: BetterAuth's expo server plugin should append ?cookie=<session-cookies>
  // to deep link redirects after OAuth callbacks, but the plugin's after hook doesn't see
  // the location header set by thrown redirects (ctx.context.responseHeaders vs response headers).
  // We manually append the cookie here so expoClient's built-in flow can extract it.
  if (path.includes("/callback/")) {
    const location = response.headers.get("location") || "";
    const setCookie = response.headers.get("set-cookie") || "";
    if (location.startsWith("football-with-friends://") && !location.includes("cookie=") && setCookie) {
      const redirectURL = new URL(location);
      redirectURL.searchParams.set("cookie", setCookie);
      const newHeaders = new Headers(response.headers);
      newHeaders.set("location", redirectURL.toString());
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
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


// Export for Cloudflare Workers with Sentry error monitoring
export default Sentry.withSentry(
  (env: Bindings) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  }),
  {
    fetch: app.fetch,
    async scheduled(event: any, env: Bindings, ctx: any) {
      console.log("[CRON] Running scheduled tasks");
      injectEnv(env);
      ctx.waitUntil(
        Promise.allSettled([
          updateMatchStatuses(),
          sendMatchReminders(),
          sendEngagementReminders(),
        ]).then((results) => {
          for (const r of results) {
            if (r.status === "rejected") {
              console.error("[CRON] Task failed:", r.reason);
            }
          }
        }),
      );
    },
  } as any,
);
