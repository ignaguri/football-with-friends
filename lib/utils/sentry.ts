/**
 * Centralized Sentry utility for safe Sentry operations
 * Works with Sentry already initialized via instrumentation files
 */

import * as Sentry from "@sentry/nextjs";

/**
 * Get the Sentry instance if available
 * @returns Sentry instance or null if not available
 */
export function getSentry() {
  return process.env.NODE_ENV === "production" ? Sentry : null;
}

/**
 * Check if Sentry is available
 * @returns true if Sentry is loaded and available
 */
export function isSentryAvailable() {
  return process.env.NODE_ENV === "production";
}

/**
 * Safely capture a message with Sentry
 * @param message - The message to capture
 * @param options - Optional Sentry options
 */
export function captureMessage(
  message: string,
  options?: Parameters<typeof Sentry.captureMessage>[1],
) {
  if (isSentryAvailable()) {
    Sentry.captureMessage(message, options);
  }
}

/**
 * Safely capture an exception with Sentry
 * @param error - The error to capture
 * @param options - Optional Sentry options
 */
export function captureException(
  error: Parameters<typeof Sentry.captureException>[0],
  options?: Parameters<typeof Sentry.captureException>[1],
) {
  if (isSentryAvailable()) {
    Sentry.captureException(error, options);
  }
}

/**
 * Safely set context with Sentry
 * @param key - The context key
 * @param context - The context data
 */
export function setContext(
  key: string,
  context: Parameters<typeof Sentry.setContext>[1],
) {
  if (isSentryAvailable()) {
    Sentry.setContext(key, context);
  }
}
