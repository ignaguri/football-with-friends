import { FlatCompat } from "@eslint/eslintrc";
import nextPlugin from "@next/eslint-plugin-next";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";
import reactPlugin from "eslint-plugin-react";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tailwindcss from "eslint-plugin-tailwindcss";
import unusedImports from "eslint-plugin-unused-imports";
import { dirname } from "path";
import { fileURLToPath } from "url";

import migrationFormatRule from "./eslint-rules/migration-format.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

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
  // "tailwindcss/classnames-order": "warn",
  // "tailwindcss/no-custom-classname": "warn",
  // "tailwindcss/no-contradicting-classname": "error",
  "prettier/prettier": "warn",
};

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  }, // TypeScript & TSX files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: true,
        JSX: true,
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
      tailwindcss: tailwindcss,
      prettier: prettierPlugin,
      react: reactPlugin,
      import: importPlugin,
      "@next/next": nextPlugin,
      "migration-format": {
        rules: {
          "migration-format": migrationFormatRule,
        },
      },
    },
    settings: {
      tailwindcss: {
        config: "./tailwind.config.ts",
        callees: ["cn", "cva", "clsx"],
        classRegex: "cn\\(([^)]*)\\)",
      },
    },
    rules: {
      ...commonRules,
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
  }, // JavaScript & MJS files
  {
    files: ["**/*.js", "**/*.mjs"],
    plugins: {
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
      tailwindcss: tailwindcss,
      prettier: prettierPlugin,
      react: reactPlugin,
      import: importPlugin,
    },
    settings: {
      tailwindcss: {
        config: "./tailwind.config.ts",
        callees: ["cn", "cva", "clsx"],
        classRegex: "cn\\(([^)]*)\\)",
      },
    },
    languageOptions: {
      globals: {
        React: true,
        JSX: true,
      },
    },
    rules: commonRules,
  },
  prettierConfig,
  { ignores: ["node_modules", "dist"] },
];

export default config;
