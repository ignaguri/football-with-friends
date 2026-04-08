import * as Sentry from "@sentry/react-native";
import { isRunningInExpoGo } from "expo";

let navigationIntegration: ReturnType<
  typeof Sentry.reactNavigationIntegration
>;

function initSentry() {
  navigationIntegration = Sentry.reactNavigationIntegration({
    enableTimeToInitialDisplay: !isRunningInExpoGo(),
  });

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2,
    sampleRate: 1.0,
    enableNativeFramesTracking: !isRunningInExpoGo(),
    integrations: [navigationIntegration],
    environment: process.env.EXPO_PUBLIC_ENV || "development",
    enabled:
      !!process.env.EXPO_PUBLIC_SENTRY_DSN &&
      process.env.EXPO_PUBLIC_ENV !== "development",
  });
}

export { Sentry, initSentry, navigationIntegration };
