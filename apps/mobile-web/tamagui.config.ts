// @ts-nocheck - Tamagui's complex recursive types can cause "Maximum call stack size exceeded" during type checking
import { createTamagui } from "tamagui";
import { themes } from "./lib/themes";
import { fonts } from "./lib/fonts";
import { defaultConfig } from "@tamagui/config/v4";
import { shorthands } from "@tamagui/shorthands";
import { Platform } from "react-native";

// Web-only settings for CSS variable-based theme switching
const webSettings =
  Platform.OS === "web"
    ? {
        fastSchemeChange: true,
        shouldAddPrefersColorThemes: true,
      }
    : {};

const config = createTamagui({
  ...defaultConfig,
  fonts,
  themes,
  shorthands,
  settings: {
    ...defaultConfig.settings,
    ...webSettings,
    onlyAllowShorthands: false,
  },
});

export default config;

export type Conf = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends Conf {}
}
