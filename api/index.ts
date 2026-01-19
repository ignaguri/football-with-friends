// Vercel Serverless Function entry point for Hono API
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { handle } from "hono/vercel";

import { auth } from "../apps/api/src/auth";
import matchesRoute from "../apps/api/src/routes/matches";
import courtsRoute from "../apps/api/src/routes/courts";
import locationsRoute from "../apps/api/src/routes/locations";
import profileRoute from "../apps/api/src/routes/profile";
import settingsRoute from "../apps/api/src/routes/settings";

const app = new Hono().basePath("/api");

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:8081",
      "http://localhost:8085",
      "http://localhost:19006",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

// Health check
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

// Better Auth routes
app.on(["POST", "GET"], "/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// API routes
app
  .route("/matches", matchesRoute)
  .route("/courts", courtsRoute)
  .route("/locations", locationsRoute)
  .route("/profile", profileRoute)
  .route("/settings", settingsRoute);

// Export for Vercel
export default handle(app);
