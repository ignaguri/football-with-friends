import { LibsqlDialect } from "@libsql/kysely-libsql";
import { getEnv, getTursoEnv, getLocalDbEnv } from "@repo/shared/env";
import { betterAuth } from "better-auth";
import { admin, username, oAuthProxy, bearer, phoneNumber, oneTap } from "better-auth/plugins";
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
let _auth: ReturnType<typeof createAuthInstance> | null = null;

function createAuthInstance() {
  const env = getEnv();
  const databaseDialect = getDatabaseConfig();

  return betterAuth({
    appName: "Fulbo con los pibes",
    baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:3001",
    trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || ((request) => {
      const staticOrigins = [
        "http://localhost:8081",
        "http://localhost:8085",
        "http://localhost:19006",
        "http://localhost:3000",
        "http://localhost:3001",
        // Vercel production
        "https://football-with-friends.vercel.app",
        // Allow native app deep link callback
        "football-with-friends://",
      ];

      // If no request, return static origins (used during initialization)
      if (!request) {
        return staticOrigins;
      }

      // Get the origin from request headers
      const origin = request.headers.get("origin") || "";

      // Check if it's a Vercel preview deployment for our project
      // Patterns:
      // - Hash: football-with-friends-{hash}-ignacio-guris-projects.vercel.app
      // - Git branch: football-with-friends-git-{branch}-ignacio-guris-projects.vercel.app
      const vercelPreviewPattern = /^https:\/\/football-with-friends-.+-ignacio-guris-projects\.vercel\.app$/;
      if (vercelPreviewPattern.test(origin)) {
        return [...staticOrigins, origin];
      }

      return staticOrigins;
    }),
    // Allow requests without origin header (mobile apps)
    advanced: {
      crossSubDomainCookies: {
        enabled: false,
      },
      // Disable CSRF check for mobile apps that don't send Origin header
      disableCSRFCheck: true,
      // Disable origin check for callbackURL validation
      // This is needed because Vercel preview URLs are dynamic and can't be
      // enumerated in trustedOrigins. Since we already have CSRF disabled,
      // this doesn't introduce additional security risks.
      // TODO: Use a custom domain for both services to avoid this security trade-off
      disableOriginCheck: true,
      // Cross-origin cookies for production (Vercel → CF Workers, different domains).
      // In development: no SameSite/Secure restrictions so native iOS (React Native)
      // can store and send cookies over plain HTTP localhost.
      ...(env.NODE_ENV === "production"
        ? {
            defaultCookieAttributes: {
              sameSite: "none" as const,
              secure: true,
              partitioned: true,
            },
          }
        : {}),
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
    // Account settings for cross-origin OAuth
    // skipStateCookieCheck is needed because the web app (Vercel) and API (CF Workers)
    // are on different domains, so the OAuth state cookie can't be shared.
    // TODO: Use a custom domain for both services to avoid this security trade-off
    account: {
      skipStateCookieCheck: true,
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
        phoneNumber: {
          type: "string",
          required: false,
          input: true,
        },
        phoneNumberVerified: {
          type: "number",
          required: false,
          defaultValue: 0,
          input: false,
        },
        primaryAuthMethod: {
          type: "string",
          required: false,
          defaultValue: "email",
          input: false,
        },
      },
    },
    socialProviders: {
      google: {
        clientId: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
      // Apple Sign In — enabled when APPLE_CLIENT_ID and APPLE_CLIENT_SECRET are set.
      // APPLE_CLIENT_ID: your Apple Services ID (e.g. com.pepegrillo.football-with-friends)
      // APPLE_CLIENT_SECRET: JWT generated from your Apple .p8 private key
      ...(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
        ? {
            apple: {
              clientId: env.APPLE_CLIENT_ID,
              clientSecret: env.APPLE_CLIENT_SECRET,
            },
          }
        : {}),
    },
    plugins: [
      bearer(),
      admin(),
      username({
        minUsernameLength: 3,
        maxUsernameLength: 20,
      }),
      expo(),
      // Phone number authentication with password-as-OTP
      // We use the native phoneNumber plugin for session management,
      // but validate the password (passed as "code") against the credential account
      phoneNumber({
        sendOTP: async () => {
          // No-op: we don't send real SMS
          // The client will pass the password as "code" to verify()
        },
        verifyOTP: async ({ phoneNumber: phone, code }, ctx) => {
          // 'code' is actually the user's password
          // Find user by phone number
          const user = await ctx?.context.adapter.findOne({
            model: "user",
            where: [{ field: "phoneNumber", value: phone }],
          }) as { id: string } | null;

          if (!user) return false;

          // Get credential account with password hash
          const accounts = await ctx?.context.internalAdapter.findAccountByUserId(user.id);
          const credentialAccount = accounts?.find((a: any) => a.providerId === "credential");

          if (!credentialAccount?.password) return false;

          // Verify password against stored hash
          const isValid = await ctx?.context.password.verify({
            hash: credentialAccount.password,
            password: code,
          });

          return isValid ?? false;
        },
        // Don't auto-create users on verify - we handle signup via custom endpoint
      }),
      // OAuth Proxy plugin - handles OAuth callbacks for cross-domain setups
      // This allows preview deployments (Vercel) to work with OAuth without
      // needing to register each preview URL with the OAuth provider
      oAuthProxy({
        productionURL: process.env.BETTER_AUTH_BASE_URL || "https://football-api.pepe-grillo-parlante.workers.dev",
      }),
      // One Tap plugin - enables ID token-based Google authentication
      // This bypasses cross-domain cookie issues by using Google Identity Services
      // instead of redirect-based OAuth flow
      oneTap(),
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
export const auth = new Proxy({} as ReturnType<typeof createAuthInstance>, {
  get(_target, prop) {
    return getAuth()[prop as keyof ReturnType<typeof createAuthInstance>];
  },
});
