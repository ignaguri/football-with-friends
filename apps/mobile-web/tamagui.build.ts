export default {
  config: './tamagui.config.ts',
  components: ['tamagui'],
  platform: (process.env.TAMAGUI_TARGET as 'web' | 'native') || 'web',
}
