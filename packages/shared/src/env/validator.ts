// Environment variables validation with Zod

import { z } from "zod";

// Storage provider types
const StorageProviderSchema = z.enum(["turso", "local-db"], {
  message:
    "STORAGE_PROVIDER must be one of: 'turso', 'local-db'",
});

// Base environment schema (always required)
const BaseEnvSchema = z.object({
  // Storage configuration
  STORAGE_PROVIDER: StorageProviderSchema.default("turso"),

  // Timezone configuration
  DEFAULT_TIMEZONE: z.string().default("Europe/Berlin"),

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
    .url("NEXT_PUBLIC_BASE_URL must be a valid URL")
    .optional(),

  // External service URLs
  NEXT_PUBLIC_PAYPAL_URL: z
    .url("NEXT_PUBLIC_PAYPAL_URL must be a valid URL")
    .default("http://paypal.me/organizer-name"),
  NEXT_PUBLIC_ORGANIZER_WHATSAPP: z.string().default("491234567890"),

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

// Turso database specific environment schema
const TursoEnvSchema = z.object({
  TURSO_DATABASE_URL: z
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
const TursoEnvSchemaComplete = BaseEnvSchema.merge(TursoEnvSchema);
const LocalDbEnvSchemaComplete = BaseEnvSchema.merge(LocalDbEnvSchema);

// Type definitions for validated environment
export type TursoEnvironment = z.infer<typeof TursoEnvSchemaComplete>;
export type LocalDbEnvironment = z.infer<typeof LocalDbEnvSchemaComplete>;
export type ValidatedEnvironment =
  | TursoEnvironment
  | LocalDbEnvironment;

// Combined environment schema based on storage provider
export function createEnvironmentSchema(storageProvider?: string) {
  const provider =
    storageProvider || process.env.STORAGE_PROVIDER || "turso";

  switch (provider) {
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
  const storageProvider = env.STORAGE_PROVIDER || "turso";

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
        "💡 Available storage providers: turso, local-db",
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

# Timezone Configuration (defaults to Europe/Berlin)
DEFAULT_TIMEZONE=Europe/Berlin

# Google OAuth (for BetterAuth)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# BetterAuth Secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your_32_character_or_longer_secret

# App URL (optional)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# External Service URLs
NEXT_PUBLIC_PAYPAL_URL=http://paypal.me/name-of-receiver
NEXT_PUBLIC_ORGANIZER_WHATSAPP=49111111111

# Sentry (optional)
SENTRY_AUTH_TOKEN=your_sentry_token
`;

  switch (storageProvider) {
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
