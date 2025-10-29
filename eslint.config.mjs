import nextPlugin from "@next/eslint-plugin-next";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tailwindcss from "eslint-plugin-tailwindcss";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";

import migrationFormatRule from "./eslint-rules/migration-format.js";

// Common rules that apply to both TypeScript and JavaScript files
const commonRules = {
  "no-console": "warn",
  "react/display-name": "off",
  "react/jsx-curly-brace-presence": [
    "warn",
    {
      props: "never",
      children: "never",
    },
  ],
  "import/order": [
    "warn",
    {
      groups: [
        ["builtin", "external", "internal", "index", "object"],
        ["type"], // All type imports go after other imports
      ],
      "newlines-between": "always", // Add a new line between groups
      alphabetize: {
        order: "asc", // Sort in ascending order
        caseInsensitive: true,
      },
    },
  ],
  "unused-imports/no-unused-imports": "warn",
  "unused-imports/no-unused-vars": [
    "warn",
    {
      vars: "all",
      varsIgnorePattern: "^_",
      args: "after-used",
      argsIgnorePattern: "^_",
    },
  ],
  "simple-import-sort/exports": "warn",
  "tailwindcss/classnames-order": "warn",
  "tailwindcss/no-custom-classname": "warn",
  "tailwindcss/no-contradicting-classname": "error",
  "prettier/prettier": "warn",
};

const config = [
  // Ignores must come first
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  // TypeScript & TSX files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
        JSX: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
      tailwindcss: tailwindcss,
      prettier: prettierPlugin,
      import: importPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
      tailwindcss: {
        config: "./tailwind.config.ts",
        callees: ["cn", "cva", "clsx"],
        classRegex: "cn\\(([^)]*)\\)",
      },
    },
    rules: {
      ...commonRules,
      // Next.js rules
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // React rules
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // TypeScript rules
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  // Migration files specific rules
  {
    files: ["migrations/**/*.ts"],
    plugins: {
      "migration-format": {
        rules: {
          "migration-format": migrationFormatRule,
        },
      },
    },
    rules: {
      "migration-format/migration-format": "error",
    },
  },
  // JavaScript & MJS files
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
        JSX: "readonly",
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
      tailwindcss: tailwindcss,
      prettier: prettierPlugin,
      import: importPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
      tailwindcss: {
        config: "./tailwind.config.ts",
        callees: ["cn", "cva", "clsx"],
        classRegex: "cn\\(([^)]*)\\)",
      },
    },
    rules: {
      ...commonRules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },
  // Prettier config - disable conflicting rules
  ...(Array.isArray(prettierConfig) ? prettierConfig : [prettierConfig]),
];

export default config;
