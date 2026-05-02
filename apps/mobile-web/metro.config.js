const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

// Get the app root (apps/mobile-web); the monorepo root is workspaceRoot
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getSentryExpoConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Map workspace packages explicitly for pnpm compatibility
config.resolver.extraNodeModules = {
  "@repo/api-client": path.resolve(workspaceRoot, "packages/api-client"),
  "@repo/shared": path.resolve(workspaceRoot, "packages/shared"),
  "@repo/ui": path.resolve(workspaceRoot, "packages/ui"),
};

// 4. Add font asset extensions for Montserrat fonts
config.resolver.assetExts.push("ttf", "woff2");

module.exports = config;
