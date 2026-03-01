const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Get the project root (monorepo root)
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

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

// 4. Handle symlinks properly (important for pnpm)
config.resolver.unstable_enableSymlinks = true;

// 5. Expo 49 issue: default metro config needs to include "mjs"
// https://github.com/expo/expo/issues/23180
config.resolver.sourceExts.push('mjs');

// 6. Add font asset extensions for Montserrat fonts
config.resolver.assetExts.push('ttf', 'woff2');

module.exports = config;
