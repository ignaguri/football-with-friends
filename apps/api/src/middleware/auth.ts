import { ORPCError, os } from "@orpc/server";

import { auth } from "../auth";

export interface AuthContext {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

// Auth middleware
export const authMiddleware = os
  .$context<{ request: Request }>()
  .middleware(async ({ context, next }) => {
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });

    if (!session || !session.user) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "You must be logged in to perform this action",
      });
    }

    const user: AuthContext["user"] = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || "",
      role: (session.user as any).role || "user",
    };

    return next({ context: { user } });
  });

// Admin check middleware (must be used AFTER authMiddleware)
const adminCheckMiddleware = os.middleware(async ({ context, next }) => {
  const user = (context as any).user;

  if (!user || user.role !== "admin") {
    throw new ORPCError("FORBIDDEN", {
      message: "You must be an admin to perform this action",
    });
  }

  return next();
});

// Combined admin auth middleware
// Note: This is created in procedures/base.ts using base.use() pattern
export { adminCheckMiddleware };
