// Shared API route registrations used by both index.ts (Bun) and worker.ts (CF Workers)
import type { Hono } from "hono";

import matchesRoute from "./routes/matches";
import courtsRoute from "./routes/courts";
import locationsRoute from "./routes/locations";
import profileRoute from "./routes/profile";
import settingsRoute from "./routes/settings";
import playersRoute from "./routes/players";
import cronRoute from "./routes/cron";
import phoneAuthRoute from "./routes/phone-auth";
import votingRoute from "./routes/voting";
import rankingsRoute from "./routes/rankings";

export function registerApiRoutes(app: Hono<any>) {
  return app
    .basePath("/api")
    .route("/matches", matchesRoute)
    .route("/courts", courtsRoute)
    .route("/locations", locationsRoute)
    .route("/profile", profileRoute)
    .route("/settings", settingsRoute)
    .route("/players", playersRoute)
    .route("/rankings", rankingsRoute)
    .route("/cron", cronRoute)
    .route("/phone-auth", phoneAuthRoute)
    .route("/voting", votingRoute);
}

export type ApiRoutes = ReturnType<typeof registerApiRoutes>;
