// IMPORTANT: bump these only when a new build is LIVE on the App Store /
// Play Store track. The values drive the in-app "new version available"
// banner; bumping early sends users to a store listing that hasn't shipped
// yet. The `pnpm check:app-versions` pre-commit hook enforces sync with
// `apps/mobile-web/app.config.ts`.
export const APP_VERSIONS = {
  ios: {
    version: "1.3.7",
    buildNumber: 29,
    storeUrl: "https://apps.apple.com/us/app/fulbo-with-friends/id6759833737",
  },
  android: {
    version: "1.3.7",
    versionCode: 15,
    storeUrl:
      "https://play.google.com/store/apps/details?id=com.pepegrillo.footballwithfriends",
  },
} as const;

export type AppVersions = typeof APP_VERSIONS;
