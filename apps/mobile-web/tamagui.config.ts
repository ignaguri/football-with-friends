import { createTamagui } from 'tamagui'
import { themes } from './lib/themes'
import { defaultConfig } from '@tamagui/config/v4'
import { shorthands } from '@tamagui/shorthands'

const config = createTamagui({
  ...defaultConfig,
  themes,
  shorthands,
})

export default config

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
