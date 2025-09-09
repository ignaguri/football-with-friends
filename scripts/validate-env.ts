#!/usr/bin/env tsx
// Environment validation CLI tool

import {
  validateEnvironment,
  getRequiredVariables,
  generateEnvTemplate,
} from "@/lib/env/validator";
import fs from "fs";
import path from "path";

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function printHeader() {
  console.log(`${colors.blue}${colors.bold}
╭─────────────────────────────────────────╮
│        Environment Validator           │
│     Football with Friends App          │
╰─────────────────────────────────────────╯${colors.reset}\n`);
}

function printSuccess(message: string) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function printError(message: string) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function printWarning(message: string) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function printInfo(message: string) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function checkEnvFile(): boolean {
  const envPath = path.join(process.cwd(), ".env");
  const envExamplePath = path.join(process.cwd(), ".env.example");

  if (!fs.existsSync(envPath)) {
    printError(".env file not found");

    if (fs.existsSync(envExamplePath)) {
      printInfo("Copy .env.example to .env and fill in the required values:");
      printInfo(`${colors.bold}cp .env.example .env${colors.reset}`);
    } else {
      printWarning(".env.example file also missing");
    }
    return false;
  }

  printSuccess(".env file found");
  return true;
}

function validateCurrentEnvironment(): boolean {
  const storageProvider = process.env.STORAGE_PROVIDER || "google-sheets";

  console.log(`\n${colors.bold}Current Configuration:${colors.reset}`);
  printInfo(
    `Storage Provider: ${colors.bold}${storageProvider}${colors.reset}`,
  );
  printInfo(
    `Node Environment: ${colors.bold}${process.env.NODE_ENV || "development"}${colors.reset}`,
  );

  try {
    const validatedEnv = validateEnvironment();

    printSuccess(`Environment validation passed for ${storageProvider}!`);

    // Show key configurations
    console.log(`\n${colors.bold}Validated Configuration:${colors.reset}`);

    switch (storageProvider) {
      case "google-sheets":
        printInfo(
          `Google Sheets ID: ${"GOOGLE_SHEETS_ID" in validatedEnv && validatedEnv.GOOGLE_SHEETS_ID ? "✓ Set" : "❌ Missing"}`,
        );
        printInfo(
          `Service Account: ${"GOOGLE_SERVICE_ACCOUNT_EMAIL" in validatedEnv && validatedEnv.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "✓ Set" : "❌ Missing"}`,
        );
        break;
      case "turso":
        printInfo(
          `Database URL: ${"TURSO_DATABASE_URL" in validatedEnv && validatedEnv.TURSO_DATABASE_URL ? "✓ Set" : "❌ Missing"}`,
        );
        printInfo(
          `Auth Token: ${"TURSO_AUTH_TOKEN" in validatedEnv && validatedEnv.TURSO_AUTH_TOKEN ? "✓ Set" : "❌ Missing"}`,
        );
        break;
      case "local-db":
        printInfo(
          `Database URL: ${"LOCAL_DATABASE_URL" in validatedEnv ? (validatedEnv as any).LOCAL_DATABASE_URL : "❌ Missing"}`,
        );
        break;
    }

    printInfo(
      `Google OAuth: ${validatedEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "✓ Configured" : "❌ Missing"}`,
    );
    printInfo(
      `BetterAuth Secret: ${validatedEnv.BETTER_AUTH_SECRET ? "✓ Set" : "❌ Missing"}`,
    );
    printInfo(
      `Sentry: ${validatedEnv.SENTRY_AUTH_TOKEN ? "✓ Configured" : "⚠️  Optional"}`,
    );

    return true;
  } catch (error) {
    printError("Environment validation failed:");
    console.log(error instanceof Error ? error.message : String(error));
    return false;
  }
}

function showRequiredVariables(provider?: string) {
  const storageProvider =
    provider || process.env.STORAGE_PROVIDER || "google-sheets";
  const required = getRequiredVariables(storageProvider);

  console.log(
    `\n${colors.bold}Required Variables for ${storageProvider}:${colors.reset}`,
  );
  required.forEach((variable) => {
    console.log(`  • ${variable}`);
  });
}

function generateTemplate(provider?: string) {
  const storageProvider =
    provider || process.env.STORAGE_PROVIDER || "google-sheets";
  const template = generateEnvTemplate(storageProvider);

  console.log(
    `\n${colors.bold}Generated .env template for ${storageProvider}:${colors.reset}`,
  );
  console.log(`${colors.yellow}${template}${colors.reset}`);

  // Offer to save template
  const templatePath = `.env.${storageProvider}.example`;
  try {
    fs.writeFileSync(templatePath, template);
    printSuccess(`Template saved to ${templatePath}`);
    printInfo(
      `Copy it to .env: ${colors.bold}cp ${templatePath} .env${colors.reset}`,
    );
  } catch (error) {
    printWarning(`Could not save template: ${error}`);
  }
}

async function main() {
  printHeader();

  const command = process.argv[2];
  const provider = process.argv[3];

  switch (command) {
    case "check":
    case "validate":
    case undefined:
      console.log("🔍 Validating environment configuration...\n");

      const hasEnvFile = checkEnvFile();
      if (!hasEnvFile) {
        process.exit(1);
      }

      const isValid = validateCurrentEnvironment();
      if (!isValid) {
        console.log(`\n${colors.bold}💡 Helpful Commands:${colors.reset}`);
        printInfo(
          `Show required variables: ${colors.bold}pnpm validate-env requirements${colors.reset}`,
        );
        printInfo(
          `Generate template: ${colors.bold}pnpm validate-env template [provider]${colors.reset}`,
        );
        printInfo(`Available providers: google-sheets, turso, local-db`);
        process.exit(1);
      }

      printSuccess("\n🎉 Environment is properly configured!");
      break;

    case "requirements":
    case "required":
      showRequiredVariables(provider);
      break;

    case "template":
    case "generate":
      generateTemplate(provider);
      break;

    case "help":
      console.log(`${colors.bold}Usage:${colors.reset}
  pnpm validate-env [command] [provider]

${colors.bold}Commands:${colors.reset}
  check, validate     Validate current environment (default)
  requirements        Show required variables for storage provider
  template            Generate .env template for storage provider
  help               Show this help message

${colors.bold}Providers:${colors.reset}
  google-sheets      Use Google Sheets as storage (default)
  turso             Use Turso database as storage  
  local-db          Use local SQLite database

${colors.bold}Examples:${colors.reset}
  pnpm validate-env
  pnpm validate-env check
  pnpm validate-env requirements turso
  pnpm validate-env template local-db
      `);
      break;

    default:
      printError(`Unknown command: ${command}`);
      printInfo("Run 'pnpm validate-env help' for usage information");
      process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  printError(`CLI error: ${error}`);
  process.exit(1);
});
