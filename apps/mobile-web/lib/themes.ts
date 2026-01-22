// @ts-nocheck - Tamagui theme generation creates complex recursive types that can cause stack overflow during type checking
import { createThemes, defaultComponentThemes } from '@tamagui/theme-builder'
import * as Colors from '@tamagui/colors'

const darkPalette = ['hsla(45, 16%, 1%, 1)','hsla(45, 16%, 6%, 1)','hsla(45, 16%, 12%, 1)','hsla(45, 16%, 17%, 1)','hsla(45, 16%, 23%, 1)','hsla(45, 16%, 28%, 1)','hsla(45, 16%, 34%, 1)','hsla(45, 16%, 39%, 1)','hsla(45, 16%, 45%, 1)','hsla(45, 16%, 50%, 1)','hsla(0, 15%, 93%, 1)','hsla(0, 15%, 99%, 1)']
const lightPalette = ['hsla(45, 16%, 94%, 1)','hsla(45, 16%, 89%, 1)','hsla(45, 16%, 84%, 1)','hsla(45, 16%, 79%, 1)','hsla(45, 16%, 74%, 1)','hsla(45, 16%, 70%, 1)','hsla(45, 16%, 65%, 1)','hsla(45, 16%, 60%, 1)','hsla(45, 16%, 55%, 1)','hsla(45, 16%, 50%, 1)','hsla(0, 15%, 15%, 1)','hsla(0, 15%, 1%, 1)']

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

// we're adding some example sub-themes for you to show how they are done, "success" "warning", "error":

const builtThemes = createThemes({
  componentThemes: defaultComponentThemes,

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
        ...Colors.gray,
        ...lightShadows,
        shadowColor: lightShadows.shadow1,
      },
      dark: {
        ...Colors.blueDark,
        ...Colors.greenDark,
        ...Colors.redDark,
        ...Colors.yellowDark,
        ...Colors.grayDark,
        ...darkShadows,
        shadowColor: darkShadows.shadow1,
      },
    },
  },

  accent: {
    palette: {
      dark: ['hsla(133, 50%, 38%, 1)','hsla(133, 50%, 40%, 1)','hsla(133, 50%, 43%, 1)','hsla(133, 50%, 45%, 1)','hsla(133, 50%, 48%, 1)','hsla(133, 50%, 50%, 1)','hsla(133, 50%, 53%, 1)','hsla(133, 50%, 55%, 1)','hsla(133, 50%, 58%, 1)','hsla(133, 50%, 60%, 1)','hsla(250, 50%, 90%, 1)','hsla(250, 50%, 95%, 1)'],
      light: ['hsla(133, 50%, 40%, 1)','hsla(133, 50%, 43%, 1)','hsla(133, 50%, 46%, 1)','hsla(133, 50%, 48%, 1)','hsla(133, 50%, 51%, 1)','hsla(133, 50%, 54%, 1)','hsla(133, 50%, 57%, 1)','hsla(133, 50%, 59%, 1)','hsla(133, 50%, 62%, 1)','hsla(133, 50%, 65%, 1)','hsla(250, 50%, 95%, 1)','hsla(250, 50%, 95%, 1)'],
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

  // optionally add more, can pass palette or template

  // grandChildrenThemes: {
  //   alt1: {
  //     template: 'alt1',
  //   },
  //   alt2: {
  //     template: 'alt2',
  //   },
  //   surface1: {
  //     template: 'surface1',
  //   },
  //   surface2: {
  //     template: 'surface2',
  //   },
  //   surface3: {
  //     template: 'surface3',
  //   },
  // },
})

export type Themes = typeof builtThemes

// Export full themes - CSS hydration optimization doesn't work reliably with Expo web
// The bundle size increase is minimal and ensures themes always work correctly
export const themes: Themes = builtThemes as any
