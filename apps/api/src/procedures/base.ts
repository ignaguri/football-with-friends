import { ORPCError, os } from "@orpc/server";

import { auth } from "../auth";

// Base procedure with request context
const base = os.$context<{ request: Request }>();

// Auth middleware
const authMiddleware = base.middleware(async ({ context, next }) => {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });

  if (!session || !session.user) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "You must be logged in to perform this action",
    });
  }

  const user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name || "",
    role: (session.user as any).role || "user",
  };

  return next({ context: { user } });
});

// Admin check middleware
const adminCheckMiddleware = base.middleware(async ({ context, next }) => {
  const user = (context as any).user;

  if (!user || user.role !== "admin") {
    throw new ORPCError("FORBIDDEN", {
      message: "You must be an admin to perform this action",
    });
  }

  return next();
});

// Export procedure builders
export const baseProcedure = base;
export const authedProcedure = base.use(authMiddleware);
export const adminProcedure = base.use(authMiddleware).use(adminCheckMiddleware);
