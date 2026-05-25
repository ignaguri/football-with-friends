// Shared API route registrations used by both index.ts (Bun) and worker.ts (CF Workers)
import type { Hono } from "hono";

import matchesRoute from "./routes/matches";
import courtsRoute from "./routes/courts";
import groupsRoute from "./routes/groups";
import groupRequestsRoute from "./routes/group-requests";
import locationsRoute from "./routes/locations";
import profileRoute from "./routes/profile";
import settingsRoute from "./routes/settings";
import playersRoute from "./routes/players";
import cronRoute from "./routes/cron";
import phoneAuthRoute from "./routes/phone-auth";
import votingRoute from "./routes/voting";
import rankingsRoute from "./routes/rankings";
import pushTokensRoute from "./routes/push-tokens";
import notificationsRoute from "./routes/notifications";
import notificationPreferencesRoute from "./routes/notification-preferences";
import matchMediaRoute from "./routes/match-media";
import invitesRoute from "./routes/invites";
import ogRoute from "./routes/og";
import appVersionRoute from "./routes/app-version";

export function registerApiRoutes(app: Hono<any>) {
  return app
    .basePath("/api")
    .route("/matches", matchesRoute)
    .route("/courts", courtsRoute)
    .route("/groups", groupsRoute)
    .route("/group-requests", groupRequestsRoute)
    .route("/locations", locationsRoute)
    .route("/profile", profileRoute)
    .route("/settings", settingsRoute)
    .route("/players", playersRoute)
    .route("/rankings", rankingsRoute)
    .route("/cron", cronRoute)
    .route("/phone-auth", phoneAuthRoute)
    .route("/voting", votingRoute)
    .route("/push-tokens", pushTokensRoute)
    .route("/notifications", notificationsRoute)
    .route("/notification-preferences", notificationPreferencesRoute)
    .route("/match-media", matchMediaRoute)
    .route("/invites", invitesRoute)
    .route("/og", ogRoute)
    .route("/app-version", appVersionRoute);
}

export type ApiRoutes = ReturnType<typeof registerApiRoutes>;
