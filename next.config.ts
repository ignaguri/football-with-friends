import createNextIntlPlugin from "next-intl/plugin";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["@libsql/client", "@libsql/kysely-libsql", "libsql"],
  webpack: (config) => {
    // Handle libsql native modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Don't externalize libsql packages - bundle them
    config.externals = config.externals.filter(
      (external: string | RegExp | (() => boolean)) =>
        !["@libsql/client", "@libsql/kysely-libsql", "libsql"].includes(
          external as string,
        ),
    );

    return config;
  },
};

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: "./locales/en/common.json",
  },
});

export default withNextIntl(nextConfig);
