import { genericOAuthClient } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { toast } from "sonner";

import type { auth } from "./auth";

export const client = createAuthClient({
  plugins: [
    genericOAuthClient(),
    adminClient(),
    inferAdditionalFields<typeof auth>(),
  ],
  fetchOptions: {
    onError(e) {
      console.error("🔐 Auth client error:", {
        status: e.error.status,
        message: e.error.message,
        code: e.error.code,
        timestamp: new Date().toISOString(),
        url: e.error.url,
      });

      if (e.error.status === 429) {
        toast.error("Too many requests. Please try again later.");
      } else {
        toast.error(
          `Authentication error: ${e.error.message || "Unknown error"}`,
        );
      }
    },
  },
});

export const { signUp, signIn, signOut, useSession } = client;

client.$store.listen("$sessionSignal", async () => {});
