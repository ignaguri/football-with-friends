// @ts-nocheck - Tamagui's complex recursive types can cause "Maximum call stack size exceeded" during type checking
import { createTamagui } from 'tamagui'
import { themes } from './lib/themes'
import { defaultConfig } from '@tamagui/config/v4'
import { shorthands } from '@tamagui/shorthands'

const config = createTamagui({
  ...defaultConfig,
  themes,
  shorthands,
  settings: {
    ...defaultConfig.settings,
    // Ensure CSS variable-based theme switching works
    fastSchemeChange: true,
    shouldAddPrefersColorThemes: true,
  },
})

export default config

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
