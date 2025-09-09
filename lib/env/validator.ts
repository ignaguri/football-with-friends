// Environment variables validation with Zod

import { z } from "zod";

// Storage provider types
const StorageProviderSchema = z.enum(["google-sheets", "turso", "local-db"], {
  message:
    "STORAGE_PROVIDER must be one of: 'google-sheets', 'turso', 'local-db'",
});

// Base environment schema (always required)
const BaseEnvSchema = z.object({
  // Storage configuration
  STORAGE_PROVIDER: StorageProviderSchema.default("google-sheets"),

  // Authentication (BetterAuth)
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters long"),

  // Google OAuth (required for BetterAuth)
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z
    .string()
    .min(1, "NEXT_PUBLIC_GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // App URL configuration
  NEXT_PUBLIC_BASE_URL: z
    .string()
    .url("NEXT_PUBLIC_BASE_URL must be a valid URL")
    .optional(),

  // Runtime environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CI: z.string().optional(),

  // Vercel deployment
  VERCEL_URL: z.string().optional(),

  // Sentry (optional)
  SENTRY_AUTH_TOKEN: z.string().optional(),
});

// Google Sheets specific environment schema
const GoogleSheetsEnvSchema = z.object({
  GOOGLE_SHEETS_ID: z
    .string()
    .min(1, "GOOGLE_SHEETS_ID is required when using Google Sheets storage"),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z
    .string()
    .email("GOOGLE_SERVICE_ACCOUNT_EMAIL must be a valid email")
    .min(
      1,
      "GOOGLE_SERVICE_ACCOUNT_EMAIL is required when using Google Sheets storage",
    ),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z
    .string()
    .min(
      1,
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is required when using Google Sheets storage",
    )
    .refine(
      (key) => key.includes("-----BEGIN PRIVATE KEY-----"),
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must be a valid private key",
    ),
});

// Turso database specific environment schema
const TursoEnvSchema = z.object({
  TURSO_DATABASE_URL: z
    .string()
    .url("TURSO_DATABASE_URL must be a valid URL")
    .refine(
      (url) =>
        url.startsWith("libsql://") ||
        url.startsWith("http://") ||
        url.startsWith("https://"),
      "TURSO_DATABASE_URL must be a valid Turso database URL",
    ),
  TURSO_AUTH_TOKEN: z
    .string()
    .min(1, "TURSO_AUTH_TOKEN is required when using Turso database"),
});

// Local database specific environment schema
const LocalDbEnvSchema = z.object({
  LOCAL_DATABASE_URL: z
    .string()
    .default("file:./local.db")
    .refine(
      (url) => url.startsWith("file:"),
      "LOCAL_DATABASE_URL must be a file: URL",
    ),
});

// Individual environment schemas for each provider
const GoogleSheetsEnvSchemaComplete = BaseEnvSchema.merge(
  GoogleSheetsEnvSchema,
);
const TursoEnvSchemaComplete = BaseEnvSchema.merge(TursoEnvSchema);
const LocalDbEnvSchemaComplete = BaseEnvSchema.merge(LocalDbEnvSchema);

// Type definitions for validated environment
export type GoogleSheetsEnvironment = z.infer<
  typeof GoogleSheetsEnvSchemaComplete
>;
export type TursoEnvironment = z.infer<typeof TursoEnvSchemaComplete>;
export type LocalDbEnvironment = z.infer<typeof LocalDbEnvSchemaComplete>;
export type ValidatedEnvironment =
  | GoogleSheetsEnvironment
  | TursoEnvironment
  | LocalDbEnvironment;

// Combined environment schema based on storage provider
export function createEnvironmentSchema(storageProvider?: string) {
  const provider =
    storageProvider || process.env.STORAGE_PROVIDER || "google-sheets";

  switch (provider) {
    case "google-sheets":
      return GoogleSheetsEnvSchemaComplete;

    case "turso":
      return TursoEnvSchemaComplete;

    case "local-db":
      return LocalDbEnvSchemaComplete;

    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}

// Validation function with detailed error reporting
export function validateEnvironment(
  customEnv?: Record<string, string | undefined>,
): ValidatedEnvironment {
  const env = customEnv || process.env;
  const storageProvider = env.STORAGE_PROVIDER || "google-sheets";

  try {
    const schema = createEnvironmentSchema(storageProvider);
    return schema.parse(env) as ValidatedEnvironment;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.issues.map((issue) => {
        const path = issue.path.join(".");
        return `❌ ${path}: ${issue.message}`;
      });

      const errorMessage = [
        `\n🚨 Environment validation failed for storage provider: ${storageProvider}\n`,
        ...formattedErrors,
        "",
        "📝 Check your .env file and compare with .env.example",
        "💡 Available storage providers: google-sheets, turso, local-db",
        "",
      ].join("\n");

      throw new Error(errorMessage);
    }
    throw error;
  }
}

// Helper to get storage provider specific requirements
export function getRequiredVariables(storageProvider: string): string[] {
  switch (storageProvider) {
    case "google-sheets":
      return [
        "STORAGE_PROVIDER=google-sheets",
        "GOOGLE_SHEETS_ID",
        "GOOGLE_SERVICE_ACCOUNT_EMAIL",
        "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
        "BETTER_AUTH_SECRET",
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
      ];

    case "turso":
      return [
        "STORAGE_PROVIDER=turso",
        "TURSO_DATABASE_URL",
        "TURSO_AUTH_TOKEN",
        "BETTER_AUTH_SECRET",
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
      ];

    case "local-db":
      return [
        "STORAGE_PROVIDER=local-db",
        "BETTER_AUTH_SECRET",
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "LOCAL_DATABASE_URL (optional, defaults to file:./local.db)",
      ];

    default:
      return ["Unknown storage provider"];
  }
}

// Helper to generate .env template for a storage provider
export function generateEnvTemplate(storageProvider: string): string {
  const baseTemplate = `# Generated .env template for ${storageProvider}

# Database Configuration
STORAGE_PROVIDER=${storageProvider}

# Google OAuth (for BetterAuth)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# BetterAuth Secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your_32_character_or_longer_secret

# App URL (optional)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Sentry (optional)
SENTRY_AUTH_TOKEN=your_sentry_token
`;

  switch (storageProvider) {
    case "google-sheets":
      return (
        baseTemplate +
        `
# Google Sheets Configuration
GOOGLE_SHEETS_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour_private_key\\n-----END PRIVATE KEY-----\\n"
`
      );

    case "turso":
      return (
        baseTemplate +
        `
# Turso Database Configuration
TURSO_DATABASE_URL=libsql://your-database-url
TURSO_AUTH_TOKEN=your_turso_auth_token
`
      );

    case "local-db":
      return (
        baseTemplate +
        `
# Local Database Configuration
LOCAL_DATABASE_URL=file:./local.db
`
      );

    default:
      return baseTemplate;
  }
}
