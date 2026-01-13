import { config as defaultConfig } from "@tamagui/config";
import { createTamagui } from "tamagui";

const config = createTamagui(defaultConfig);

export default config;

export type Conf = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends Conf {}
}
