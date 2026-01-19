import { LibsqlDialect } from "@libsql/kysely-libsql";
import { env, getTursoEnv, getLocalDbEnv } from "@repo/shared/env";
import { betterAuth } from "better-auth";
import { admin, username } from "better-auth/plugins";

// Get database configuration for authentication
function getDatabaseConfig() {
  const environment = env;

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

const databaseDialect = getDatabaseConfig();

export const auth = betterAuth({
  appName: "Fulbo con los pibes",
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || [
    "http://localhost:8081",
    "http://localhost:8085",
    "http://localhost:19006",
    "http://localhost:3000",
    // Allow Expo development URLs
    "exp://192.168.0.63:8085",
    "exp://localhost:8085",
  ],
  // Allow requests without origin header (mobile apps)
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    // Disable CSRF check for mobile apps that don't send Origin header
    disableCSRFCheck: true,
  },
  database: {
    dialect: databaseDialect,
    type: "sqlite",
  },
  // Enable email/password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Can enable later
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
        input: false, // Only settable by admin, not by user signup
      },
      profilePicture: {
        type: "string",
        required: false,
        input: true, // Allow users to set their profile picture
      },
      nationality: {
        type: "string",
        required: false,
        input: true, // Allow users to set their nationality
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
          console.log("🔐 Google OAuth callback triggered:", {
            provider: context.body?.provider,
            timestamp: new Date().toISOString(),
            userAgent: context.request?.headers?.["user-agent"],
          });
        },
      },
    ],
  },
});
