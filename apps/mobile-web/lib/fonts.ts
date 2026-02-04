import { createFont, isWeb } from '@tamagui/core'

// Match the defaultSizes from @tamagui/config/v4 for consistency
const defaultSizes = {
  1: 11,
  2: 12,
  3: 13,
  4: 14,
  true: 14,
  5: 16,
  6: 18,
  7: 20,
  8: 23,
  9: 30,
  10: 46,
  11: 55,
  12: 62,
  13: 72,
  14: 92,
  15: 114,
  16: 134,
} as const

export const createMontserratFont = (
  font: Partial<Parameters<typeof createFont>[0]> = {},
  {
    sizeLineHeight = (size: number) => size + 10,
    sizeSize = (size: number) => size * 1,
  } = {}
) => {
  const size = Object.fromEntries(
    Object.entries({
      ...defaultSizes,
      ...font.size,
    }).map(([k, v]) => [k, sizeSize(+v)])
  )

  return createFont({
    family: isWeb
      ? 'Montserrat, -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      : 'Montserrat',

    // Android requires 'face' property to map weights to font families
    // On Android, each weight is a separate font family
    face: {
      300: { normal: 'Montserrat-Light' },
      400: { normal: 'Montserrat-Regular' },
      500: { normal: 'Montserrat-Medium' },
      600: { normal: 'Montserrat-SemiBold' },
      700: { normal: 'Montserrat-Bold' },
    },

    size,

    lineHeight: Object.fromEntries(
      Object.entries(size).map(([k, v]) => [
        k,
        sizeLineHeight(typeof v === 'number' ? v : +v),
      ])
    ),

    weight: {
      1: '300', // Light
      2: '400', // Regular
      3: '500', // Medium
      4: '600', // SemiBold
      5: '700', // Bold
    },

    letterSpacing: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },

    ...font,
  })
}

export const fonts = {
  heading: createMontserratFont(),
  body: createMontserratFont(),
}
