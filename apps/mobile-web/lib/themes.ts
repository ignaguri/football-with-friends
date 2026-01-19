// @ts-nocheck - Tamagui theme generation creates complex recursive types that can cause stack overflow during type checking
import { createThemes, defaultComponentThemes } from '@tamagui/theme-builder'
import * as Colors from '@tamagui/colors'

const darkPalette = ['hsla(109, 16%, 6%, 1)','hsla(109, 16%, 11%, 1)','hsla(109, 16%, 16%, 1)','hsla(109, 16%, 21%, 1)','hsla(109, 16%, 26%, 1)','hsla(109, 16%, 30%, 1)','hsla(109, 16%, 35%, 1)','hsla(109, 16%, 40%, 1)','hsla(109, 16%, 45%, 1)','hsla(109, 16%, 50%, 1)','hsla(0, 15%, 93%, 1)','hsla(0, 15%, 99%, 1)']
const lightPalette = ['hsla(96, 16%, 90%, 1)','hsla(97, 16%, 86%, 1)','hsla(99, 16%, 81%, 1)','hsla(100, 16%, 77%, 1)','hsla(102, 16%, 72%, 1)','hsla(103, 16%, 68%, 1)','hsla(104, 16%, 63%, 1)','hsla(106, 16%, 59%, 1)','hsla(107, 16%, 54%, 1)','hsla(109, 16%, 50%, 1)','hsla(0, 15%, 15%, 1)','hsla(0, 15%, 1%, 1)']

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
      dark: ['hsla(129, 48%, 30%, 1)','hsla(129, 48%, 33%, 1)','hsla(129, 48%, 37%, 1)','hsla(129, 48%, 40%, 1)','hsla(129, 48%, 43%, 1)','hsla(129, 48%, 47%, 1)','hsla(129, 48%, 50%, 1)','hsla(129, 48%, 53%, 1)','hsla(129, 48%, 57%, 1)','hsla(129, 48%, 60%, 1)','hsla(250, 50%, 90%, 1)','hsla(250, 50%, 95%, 1)'],
      light: ['hsla(129, 48%, 38%, 1)','hsla(129, 48%, 41%, 1)','hsla(129, 48%, 44%, 1)','hsla(129, 48%, 47%, 1)','hsla(129, 48%, 50%, 1)','hsla(129, 48%, 53%, 1)','hsla(129, 48%, 56%, 1)','hsla(129, 48%, 59%, 1)','hsla(129, 48%, 62%, 1)','hsla(129, 48%, 65%, 1)','hsla(250, 50%, 95%, 1)','hsla(250, 50%, 95%, 1)'],
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

// the process.env conditional here is optional but saves web client-side bundle
// size by leaving out themes JS. tamagui automatically hydrates themes from CSS
// back into JS for you, and the bundler plugins set TAMAGUI_ENVIRONMENT. so
// long as you are using the Vite, Next, Webpack plugins this should just work,
// but if not you can just export builtThemes directly as themes:
export const themes: Themes =
  process.env.TAMAGUI_ENVIRONMENT === 'client' &&
  process.env.NODE_ENV === 'production'
    ? ({} as any)
    : (builtThemes as any)
