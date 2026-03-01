// @ts-nocheck - Tamagui theme generation creates complex recursive types that can cause stack overflow during type checking
import { createThemes } from '@tamagui/theme-builder'
import * as Colors from '@tamagui/colors'

/**
 * Football with Friends Theme Configuration
 *
 * Base palette: Warm gray tones (45° hue, 16% saturation)
 * - Gives a softer, more welcoming feel than pure gray
 * - 12 steps from near-black to near-white
 *
 * Accent: Football green (133° hue)
 * - Represents the pitch/field
 * - Used for primary actions and success states
 *
 * Extra colors used throughout the app:
 * - blue: Links, info icons, calendar
 * - green: Success, player card, attendance confirmed
 * - red: Errors, danger, cancellation
 * - yellow: Awards (golden boot, etc.)
 * - orange: Warnings, same-day fees
 * - purple: Social features, community
 * - gray: Muted text, borders, disabled states
 */

// Dark mode: starts very dark, ends mid-gray (text will be light on these)
const darkPalette = [
  'hsla(45, 16%, 1%, 1)',   // 1 - near black (background)
  'hsla(45, 16%, 6%, 1)',   // 2
  'hsla(45, 16%, 11%, 1)',  // 3 - subtle surfaces
  'hsla(45, 16%, 16%, 1)',  // 4
  'hsla(45, 16%, 21%, 1)',  // 5 - borders
  'hsla(45, 16%, 27%, 1)',  // 6
  'hsla(45, 16%, 33%, 1)',  // 7 - muted elements
  'hsla(45, 16%, 40%, 1)',  // 8
  'hsla(45, 16%, 48%, 1)',  // 9 - secondary text
  'hsla(45, 16%, 56%, 1)',  // 10
  'hsla(45, 16%, 88%, 1)',  // 11 - primary text
  'hsla(45, 16%, 97%, 1)',  // 12 - high contrast text
]

// Light mode: starts near-white, ends mid-gray (text will be dark on these)
const lightPalette = [
  'hsla(45, 16%, 99%, 1)',  // 1 - near white (background)
  'hsla(45, 16%, 96%, 1)',  // 2
  'hsla(45, 16%, 92%, 1)',  // 3 - subtle surfaces
  'hsla(45, 16%, 88%, 1)',  // 4
  'hsla(45, 16%, 82%, 1)',  // 5 - borders
  'hsla(45, 16%, 75%, 1)',  // 6
  'hsla(45, 16%, 66%, 1)',  // 7 - muted elements
  'hsla(45, 16%, 56%, 1)',  // 8
  'hsla(45, 16%, 45%, 1)',  // 9 - secondary text
  'hsla(45, 16%, 34%, 1)',  // 10
  'hsla(45, 16%, 18%, 1)',  // 11 - primary text
  'hsla(45, 16%, 6%, 1)',   // 12 - high contrast text
]

const lightShadows = {
  shadow1: 'rgba(0,0,0,0.04)',
  shadow2: 'rgba(0,0,0,0.08)',
  shadow3: 'rgba(0,0,0,0.16)',
  shadow4: 'rgba(0,0,0,0.24)',
  shadow5: 'rgba(0,0,0,0.32)',
  shadow6: 'rgba(0,0,0,0.4)',
}

const darkShadows = {
  shadow1: 'rgba(0,0,0,0.2)',
  shadow2: 'rgba(0,0,0,0.3)',
  shadow3: 'rgba(0,0,0,0.4)',
  shadow4: 'rgba(0,0,0,0.5)',
  shadow5: 'rgba(0,0,0,0.6)',
  shadow6: 'rgba(0,0,0,0.7)',
}

// Football green accent palette (pitch/field color)
const accentDarkPalette = [
  'hsla(133, 45%, 18%, 1)',  // 1 - darkest
  'hsla(133, 45%, 22%, 1)',  // 2
  'hsla(133, 45%, 26%, 1)',  // 3
  'hsla(133, 45%, 30%, 1)',  // 4
  'hsla(133, 45%, 34%, 1)',  // 5
  'hsla(133, 50%, 38%, 1)',  // 6
  'hsla(133, 50%, 42%, 1)',  // 7
  'hsla(133, 50%, 46%, 1)',  // 8
  'hsla(133, 50%, 50%, 1)',  // 9 - main accent
  'hsla(133, 50%, 55%, 1)',  // 10
  'hsla(133, 30%, 90%, 1)',  // 11 - light text on dark
  'hsla(133, 20%, 96%, 1)',  // 12 - lightest
]

const accentLightPalette = [
  'hsla(133, 50%, 97%, 1)',  // 1 - lightest (tinted background)
  'hsla(133, 50%, 93%, 1)',  // 2
  'hsla(133, 50%, 88%, 1)',  // 3
  'hsla(133, 50%, 82%, 1)',  // 4
  'hsla(133, 50%, 74%, 1)',  // 5
  'hsla(133, 50%, 64%, 1)',  // 6
  'hsla(133, 50%, 52%, 1)',  // 7
  'hsla(133, 55%, 44%, 1)',  // 8
  'hsla(133, 60%, 36%, 1)',  // 9 - main accent
  'hsla(133, 65%, 30%, 1)',  // 10
  'hsla(133, 70%, 20%, 1)',  // 11 - dark text
  'hsla(133, 75%, 12%, 1)',  // 12 - darkest
]

const builtThemes = createThemes({
  base: {
    palette: {
      dark: darkPalette,
      light: lightPalette,
    },
    extra: {
      light: {
        ...Colors.blue,
        ...Colors.green,
        ...Colors.red,
        ...Colors.yellow,
        ...Colors.orange,
        ...Colors.gray,
        ...Colors.purple,
        ...lightShadows,
        shadowColor: lightShadows.shadow3,
      },
      dark: {
        ...Colors.blueDark,
        ...Colors.greenDark,
        ...Colors.redDark,
        ...Colors.yellowDark,
        ...Colors.orangeDark,
        ...Colors.grayDark,
        ...Colors.purpleDark,
        ...darkShadows,
        shadowColor: darkShadows.shadow3,
      },
    },
  },

  accent: {
    palette: {
      dark: accentDarkPalette,
      light: accentLightPalette,
    },
  },

  childrenThemes: {
    warning: {
      palette: {
        dark: Object.values(Colors.yellowDark),
        light: Object.values(Colors.yellow),
      },
    },
    error: {
      palette: {
        dark: Object.values(Colors.redDark),
        light: Object.values(Colors.red),
      },
    },
    success: {
      palette: {
        dark: Object.values(Colors.greenDark),
        light: Object.values(Colors.green),
      },
    },
  },
})

export type Themes = typeof builtThemes

// Export full themes - CSS hydration optimization doesn't work reliably with Expo web
// The bundle size increase is minimal and ensures themes always work correctly
export const themes: Themes = builtThemes as any
