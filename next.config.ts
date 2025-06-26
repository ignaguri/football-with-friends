import createNextIntlPlugin from "next-intl/plugin";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.externals.push("@libsql/client");
    return config;
  },
};

const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: "./locales/en/common.json",
  },
});

export default withNextIntl(nextConfig);
