// Typed environment exports with validation

import { validateEnvironment, type ValidatedEnvironment } from "./validator";

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
      return lines.filter(line => line.startsWith("❌"));
    }
    return [String(error)];
  }
}

/**
 * Convenience exports for common environment variables
 */
export const env = getEnv();

/**
 * Type-safe environment variable getters
 */
export function getGoogleSheetsEnv() {
  const environment = getEnv();
  if (environment.STORAGE_PROVIDER !== 'google-sheets') {
    throw new Error('Google Sheets environment variables are not available when STORAGE_PROVIDER is not "google-sheets"');
  }
  return environment as any;
}

export function getTursoEnv() {
  const environment = getEnv();
  if (environment.STORAGE_PROVIDER !== 'turso') {
    throw new Error('Turso environment variables are not available when STORAGE_PROVIDER is not "turso"');
  }
  return environment as any;
}

export function getLocalDbEnv() {
  const environment = getEnv();
  if (environment.STORAGE_PROVIDER !== 'local-db') {
    throw new Error('Local DB environment variables are not available when STORAGE_PROVIDER is not "local-db"');
  }
  return environment as any;
}

// Re-export types and utilities
export type { ValidatedEnvironment } from "./validator";
export { validateEnvironment, getRequiredVariables, generateEnvTemplate } from "./validator";