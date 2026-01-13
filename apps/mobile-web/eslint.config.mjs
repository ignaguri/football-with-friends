import tseslint from "typescript-eslint";

export default tseslint.config({
  ignores: [
    ".expo/**",
    "node_modules/**",
    "dist/**",
    "*.config.js",
    "*.config.ts",
    "tamagui.config.ts",
    "metro.config.js",
    "babel.config.js",
  ],
  extends: [tseslint.configs.recommended],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "no-console": "warn",
  },
});
