import { env, getTursoEnv } from "@/lib/env";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";

const tursoEnv = getTursoEnv();
const libsql = new LibsqlDialect({
  url: tursoEnv.TURSO_DATABASE_URL,
  authToken: tursoEnv.TURSO_AUTH_TOKEN,
});

export const auth = betterAuth({
  appName: "Fulbo con los pibes",
  trustedOrigins: [
    "https://football-with-friends.vercel.app",
    "https://football-with-friends-*.vercel.app",
  ],
  database: {
    dialect: libsql,
    type: "sqlite",
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // Only settable by admin, not by user signup
      },
    },
  },
  socialProviders: {
    google: {
      clientId: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // mapProfileToUser: (profile) => ({
      //   name: profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`.trim(),
      //   email: profile.email,
      //   image: profile.picture,
      //   // role is not settable by user, remains default ("user") unless set by admin
      // }),
    },
  },
  plugins: [admin()],
  logger: {
    level: "info",
    disabled: false,
  },
  callbacks: {
    after: [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        matcher(context: any) {
          return (
            context.path === "/sign-in/social" && context.method === "POST"
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler(context: any) {
          // eslint-disable-next-line no-console
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
