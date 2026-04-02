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
  // Cron
  CRON_SECRET?: string;
  // Monitoring
  SENTRY_DSN?: string;
};

type SessionUser = { id: string; email: string; name: string; role: string };

const app = new Hono<{ Bindings: Bindings; Variables: { user: SessionUser } }>();

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
    CRON_SECRET: env.CRON_SECRET,
  });

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

      // Allow all Vercel preview deployments
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

// Rate limiting for auth endpoints (per-isolate, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

app.use("/api/auth/*", async (c, next) => {
  const ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (entry && entry.resetAt > now && entry.count >= 10) {
    return c.json({ error: "Too many requests" }, 429);
  }

  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
  } else {
    entry.count++;
  }

  // Cleanup old entries periodically to avoid memory leak
  if (rateLimitMap.size > 10_000) {
    for (const [key, val] of rateLimitMap) {
      if (val.resetAt <= now) rateLimitMap.delete(key);
    }
  }

  return next();
});

app.use("/api/phone-auth/*", async (c, next) => {
  const ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
  const now = Date.now();
  const key = `phone:${ip}`;
  const entry = rateLimitMap.get(key);

  if (entry && entry.resetAt > now && entry.count >= 10) {
    return c.json({ error: "Too many requests" }, 429);
  }

  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
  } else {
    entry.count++;
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
    const rawCookieToken =
      cookieHeader.match(/__Secure-better-auth\.session_token=([^;]+)/)?.[1] ||
      cookieHeader.match(/better-auth\.session_token=([^;]+)/)?.[1] ||
      null;

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
  const response = await auth.handler(c.req.raw);

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

// Helper to inject env vars for cron (no Hono middleware in scheduled events)
function injectCronEnv(env: Bindings) {
  // @ts-ignore - process.env may not exist in CF Workers but we polyfill it
  globalThis.process = globalThis.process || { env: {} };
  Object.assign(process.env, {
    TURSO_DATABASE_URL: env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: env.TURSO_AUTH_TOKEN,
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    DEFAULT_TIMEZONE: env.DEFAULT_TIMEZONE || "Europe/Berlin",
    STORAGE_PROVIDER: env.STORAGE_PROVIDER || "turso",
    NODE_ENV: env.NODE_ENV || "production",
  });
}

// Export for Cloudflare Workers with Sentry error monitoring
export default Sentry.withSentry(
  (env: Bindings) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  }),
  {
    fetch: app.fetch,
    async scheduled(event: any, env: Bindings, ctx: any) {
      console.log("[CRON] Running scheduled match status update");
      injectCronEnv(env);
      ctx.waitUntil(updateMatchStatuses());
    },
  } as any,
);
