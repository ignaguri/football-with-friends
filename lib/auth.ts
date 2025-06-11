import { LibsqlDialect } from "@libsql/kysely-libsql";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";

const libsql = new LibsqlDialect({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

export const auth = betterAuth({
  appName: "Fulbo con los pibes",
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
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // mapProfileToUser: (profile) => ({
      //   name: profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`.trim(),
      //   email: profile.email,
      //   image: profile.picture,
      //   // role is not settable by user, remains default ("user") unless set by admin
      // }),
    },
  },
  plugins: [admin()],
});
