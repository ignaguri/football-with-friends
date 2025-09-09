import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Validate environment variables early in the startup process
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      // Import and validate environment early
      const { validateEnvironment } = await import("./lib/env/validator");
      validateEnvironment();
      console.log("✅ Environment validation passed");
    } catch (error) {
      console.error("❌ Environment validation failed:");
      console.error(error instanceof Error ? error.message : String(error));
      
      // In development, exit with error to force fix
      if (process.env.NODE_ENV === "development") {
        console.error("\n💡 Run 'pnpm validate-env' for detailed validation help");
        process.exit(1);
      }
      // In production, let it continue but log the error
      console.error("⚠️  Continuing with potentially invalid environment");
    }
    
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
