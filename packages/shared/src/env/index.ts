import type { ValidatedEnvironment } from "./validator";

import { validateEnvironment } from "./validator";

// Global validated environment cache
let validatedEnv: ValidatedEnvironment | null = null;

/**
 * Get validated environment variables
 * Validates once and caches the result for subsequent calls
 */
export function getEnv(): ValidatedEnvironment {
  if (!validatedEnv) {
    try {
      validatedEnv = validateEnvironment();
    } catch (error) {
      // In development, show helpful error and exit
      if (process.env.NODE_ENV !== "production") {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
      // In production, throw the error to be caught by error boundaries
      throw error;
    }
  }
  return validatedEnv;
}

/**
 * Reset validated environment cache (useful for testing)
 */
export function resetEnvCache(): void {
  validatedEnv = null;
}

/**
 * Check if environment is valid without throwing
 * Returns boolean indicating validity
 */
export function isEnvValid(): boolean {
  try {
    validateEnvironment();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get environment validation errors without throwing
 * Returns array of error messages or null if valid
 */
export function getEnvErrors(): string[] | null {
  try {
    validateEnvironment();
    return null;
  } catch (error) {
    if (error instanceof Error) {
      // Parse error message to extract individual validation errors
      const lines = error.message.split("\n");
      return lines.filter((line) => line.startsWith("❌"));
    }
    return [String(error)];
  }
}

/**
 * Convenience exports for common environment variables
 * Uses a Proxy for lazy access - allows Cloudflare Workers to set
 * process.env values before validation runs
 */
export const env = new Proxy({} as ValidatedEnvironment, {
  get(_target, prop) {
    return getEnv()[prop as keyof ValidatedEnvironment];
  },
});

/**
 * Type-safe environment variable getters
 */
export function getTursoEnv() {
  const environment = getEnv();
  if (environment.STORAGE_PROVIDER !== "turso") {
    throw new Error(
      'Turso environment variables are not available when STORAGE_PROVIDER is not "turso"',
    );
  }
  return environment as any;
}

export function getLocalDbEnv() {
  const environment = getEnv();
  // LOCAL_DATABASE_URL is available for local-db provider
  if (environment.STORAGE_PROVIDER === "local-db") {
    return {
      LOCAL_DATABASE_URL: (environment as any).LOCAL_DATABASE_URL,
    };
  }
  throw new Error(
    'Local DB environment variables are not available when STORAGE_PROVIDER is not "local-db"',
  );
}

// Re-export types and utilities
export type { ValidatedEnvironment } from "./validator";
export { generateEnvTemplate, getRequiredVariables, validateEnvironment } from "./validator";
