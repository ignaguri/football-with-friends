// Factory for creating notification providers based on configuration

import type { NotificationProvider } from "./types";

/**
 * Creates a notification provider based on environment configuration
 */
export function createNotificationProvider(): NotificationProvider {
  const providerType = process.env.NOTIFICATION_PROVIDER || "web-push";

  switch (providerType) {
    case "novu":
      // Lazy load to avoid import errors if not configured
      const { NovuProvider } = require("./providers/novu-provider");
      return new NovuProvider({
        apiKey: process.env.NOVU_API_KEY!,
        applicationId: process.env.NOVU_APP_ID!,
        baseUrl: process.env.NOVU_BASE_URL,
      });

    case "web-push":
    default:
      const { WebPushProvider } = require("./providers/web-push-provider");
      return new WebPushProvider({
        vapidKeys: {
          publicKey: process.env.VAPID_PUBLIC_KEY!,
          privateKey: process.env.VAPID_PRIVATE_KEY!,
          subject:
            process.env.VAPID_SUBJECT ||
            "mailto:admin@football-with-friends.com",
        },
      });
  }
}

/**
 * Validates that required environment variables are set for the selected provider
 */
export function validateNotificationProviderConfig(): {
  valid: boolean;
  errors: string[];
} {
  const providerType = process.env.NOTIFICATION_PROVIDER || "web-push";
  const errors: string[] = [];

  switch (providerType) {
    case "novu":
      if (!process.env.NOVU_API_KEY) {
        errors.push("NOVU_API_KEY is required when using Novu provider");
      }
      if (!process.env.NOVU_APP_ID) {
        errors.push("NOVU_APP_ID is required when using Novu provider");
      }
      break;

    case "web-push":
    default:
      if (!process.env.VAPID_PUBLIC_KEY) {
        errors.push(
          "VAPID_PUBLIC_KEY is required when using web-push provider",
        );
      }
      if (!process.env.VAPID_PRIVATE_KEY) {
        errors.push(
          "VAPID_PRIVATE_KEY is required when using web-push provider",
        );
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get required environment variables for a specific provider
 */
export function getRequiredEnvVars(provider: string): string[] {
  switch (provider) {
    case "novu":
      return ["NOVU_API_KEY", "NOVU_APP_ID"];
    case "web-push":
    default:
      return ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"];
  }
}
