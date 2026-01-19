import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { auth } from "./auth";
import matchesRoute from "./routes/matches";
import courtsRoute from "./routes/courts";
import locationsRoute from "./routes/locations";
import profileRoute from "./routes/profile";
import settingsRoute from "./routes/settings";

const app = new Hono();

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
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// API routes
const apiRoutes = app
  .basePath("/api")
  .route("/matches", matchesRoute)
  .route("/courts", courtsRoute)
  .route("/locations", locationsRoute)
  .route("/profile", profileRoute)
  .route("/settings", settingsRoute);

const port = process.env.PORT || 3001;

console.log(`🚀 API Server running on http://localhost:${port}`);

// Export type for RPC client
export type ApiRoutes = typeof apiRoutes;

export default {
  port,
  fetch: app.fetch,
};
