import * as Sentry from "@sentry/react-native";
import { isRunningInExpoGo } from "expo";

let _navigationIntegration: ReturnType<
  typeof Sentry.reactNavigationIntegration
> | null = null;

function initSentry() {
  _navigationIntegration = Sentry.reactNavigationIntegration({
    enableTimeToInitialDisplay: !isRunningInExpoGo(),
  });

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2,
    sampleRate: 1.0,
    enableNativeFramesTracking: !isRunningInExpoGo(),
    integrations: [_navigationIntegration],
    environment: process.env.EXPO_PUBLIC_ENV || "development",
    enabled:
      !!process.env.EXPO_PUBLIC_SENTRY_DSN &&
      process.env.EXPO_PUBLIC_ENV !== "development",
  });
}

function getNavigationIntegration() {
  if (!_navigationIntegration) {
    throw new Error("Sentry not initialized. Call initSentry() first.");
  }
  return _navigationIntegration;
}

export { Sentry, initSentry, getNavigationIntegration };
