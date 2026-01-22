import { LibsqlDialect } from "@libsql/kysely-libsql";
import { getEnv, getTursoEnv, getLocalDbEnv } from "@repo/shared/env";
import { betterAuth } from "better-auth";
import { admin, username } from "better-auth/plugins";
import { expo } from "@better-auth/expo";

// Get database configuration for authentication
function getDatabaseConfig() {
  const environment = getEnv();

  // Use Turso if STORAGE_PROVIDER is turso, otherwise use local database
  if (environment.STORAGE_PROVIDER === "turso") {
    const tursoEnv = getTursoEnv();
    return new LibsqlDialect({
      url: tursoEnv.TURSO_DATABASE_URL,
      authToken: tursoEnv.TURSO_AUTH_TOKEN,
    });
  } else {
    // Use local database for auth when using local-db storage
    const localDbEnv = getLocalDbEnv();
    return new LibsqlDialect({
      url: localDbEnv.LOCAL_DATABASE_URL,
    });
  }
}

// Lazy initialization for auth - required for Cloudflare Workers compatibility
// where environment variables are set per-request via middleware
let _auth: ReturnType<typeof betterAuth> | null = null;

function createAuthInstance() {
  const env = getEnv();
  const databaseDialect = getDatabaseConfig();

  return betterAuth({
    appName: "Fulbo con los pibes",
    baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:3001",
    trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || [
      "http://localhost:8081",
      "http://localhost:8085",
      "http://localhost:19006",
      "http://localhost:3000",
      "http://localhost:3001",
      // Vercel production
      "https://football-with-friends.vercel.app",
      // Allow native app deep link callback
      "football-with-friends:///",
    ],
    // Allow requests without origin header (mobile apps)
    advanced: {
      crossSubDomainCookies: {
        enabled: false,
      },
      // Disable CSRF check for mobile apps that don't send Origin header
      disableCSRFCheck: true,
      // Enable cross-origin cookies for web app on different domain (Vercel -> CF Workers)
      defaultCookieAttributes: {
        sameSite: "none", // Allow cross-site cookies
        secure: true, // Required for SameSite=None
        partitioned: true, // New browser standards for third-party cookies
      },
    },
    database: {
      dialect: databaseDialect,
      type: "sqlite",
    },
    // Enable email/password authentication
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
    },
    // Disable account linking - one auth method per account
    accountLinking: {
      enabled: false,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "user",
          input: false,
        },
        profilePicture: {
          type: "string",
          required: false,
          input: true,
        },
        nationality: {
          type: "string",
          required: false,
          input: true,
        },
      },
    },
    socialProviders: {
      google: {
        clientId: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [
      admin(),
      username({
        minUsernameLength: 3,
        maxUsernameLength: 20,
      }),
      expo(),
    ],
    logger: {
      level: "info",
      disabled: false,
    },
    callbacks: {
      after: [
        {
          matcher(context: any) {
            return (
              context.path === "/sign-in/social" && context.method === "POST"
            );
          },
          handler(context: any) {
            console.log("Google OAuth callback triggered:", {
              provider: context.body?.provider,
              timestamp: new Date().toISOString(),
              userAgent: context.request?.headers?.["user-agent"],
            });
          },
        },
      ],
    },
  });
}

/**
 * Get the auth instance - creates it lazily on first access
 * This allows Cloudflare Workers to set process.env before auth is initialized
 */
export function getAuth() {
  if (!_auth) {
    _auth = createAuthInstance();
  }
  return _auth;
}

/**
 * Reset auth instance - useful for testing or when environment changes
 */
export function resetAuth() {
  _auth = null;
}

// For backwards compatibility with existing code that imports `auth` directly
// This uses a Proxy to lazily access the auth instance
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    return getAuth()[prop as keyof ReturnType<typeof betterAuth>];
  },
});
