import type messages from "./locales/en/common.json";

export const locales = ["en", "es"] as const;

export type Locale = (typeof locales)[number];

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof messages;
    Locale: Locale;
  }
}
