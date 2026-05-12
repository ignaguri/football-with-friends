import { Hono } from "hono";
import { APP_VERSIONS } from "../config/app-versions";
import { type AppVariables } from "../middleware/security";

const app = new Hono<{ Variables: AppVariables }>();

app.get("/", (c) => {
  c.header("Cache-Control", "public, max-age=300");
  return c.json(APP_VERSIONS);
});

export default app;
