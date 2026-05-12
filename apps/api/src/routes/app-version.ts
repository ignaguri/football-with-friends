// apps/api/src/routes/app-version.ts
import { Hono } from "hono";
import { APP_VERSIONS } from "../config/app-versions";
import { type AppVariables } from "../middleware/security";

const app = new Hono<{ Variables: AppVariables }>();

// Public, unauthenticated. Allowlisted in middleware/security.ts.
// Cached at the edge for 5 minutes; constants only change on deploy.
app.get("/", (c) => {
  c.header("Cache-Control", "public, max-age=300");
  return c.json(APP_VERSIONS);
});

export default app;
