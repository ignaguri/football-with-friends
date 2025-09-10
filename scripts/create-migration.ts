#!/usr/bin/env tsx
// Migration file generator CLI

import { promises as fs } from "fs";
import * as path from "path";

interface MigrationTemplate {
  name: string;
  description: string;
  timestamp: string;
  content: string;
}

function generateMigrationTemplate(
  name: string,
  description: string,
): MigrationTemplate {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, "").split(".")[0]; // Format: YYYYMMDDHHMMSS
  const migrationName = `${timestamp}-${name}`;

  const content = `// ${description}

import { sql } from "kysely";

import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // TODO: Implement your migration logic here
  // Example:
  // await db.schema
  //   .createTable("new_table")
  //   .addColumn("id", "text", (col) => col.primaryKey())
  //   .addColumn("name", "text", (col) => col.notNull())
  //   .execute();

  console.log("✅ ${description}");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  // TODO: Implement rollback logic here
  // Example:
  // await db.schema.dropTable("new_table").execute();

  console.log("↩️ Rolled back: ${description}");
};
`;

  return {
    name: migrationName,
    description,
    timestamp,
    content,
  };
}

function validateMigrationName(name: string): {
  valid: boolean;
  error?: string;
} {
  // Check if name is provided
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Migration name is required" };
  }

  // Check for valid characters (alphanumeric, hyphens, underscores)
  const validNameRegex = /^[a-zA-Z0-9-_]+$/;
  if (!validNameRegex.test(name)) {
    return {
      valid: false,
      error:
        "Migration name can only contain letters, numbers, hyphens, and underscores",
    };
  }

  // Check length
  if (name.length > 50) {
    return {
      valid: false,
      error: "Migration name must be 50 characters or less",
    };
  }

  return { valid: true };
}

function sanitizeMigrationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-") // Replace invalid characters with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

async function checkMigrationExists(
  migrationName: string,
  migrationsDir: string,
): Promise<boolean> {
  try {
    const files = await fs.readdir(migrationsDir);
    return files.some((file) => file.startsWith(migrationName));
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
📋 Migration File Generator

Usage:
  pnpm create-migration <name> [description]

Arguments:
  name        Migration name (will be prefixed with date)
  description Optional description for the migration

Examples:
  pnpm create-migration add-user-table
  pnpm create-migration add-user-table "Add users table with authentication fields"
  pnpm create-migration update-match-schema "Update match table with new fields"

The migration file will be created in the migrations/ directory with the format:
  YYYYMMDDHHMMSS-<name>.ts
    `);
    process.exit(0);
  }

  const migrationName = args[0];
  const description = args[1] || `Migration: ${migrationName}`;

  // Validate migration name
  const validation = validateMigrationName(migrationName);
  if (!validation.valid) {
    console.error(`❌ Invalid migration name: ${validation.error}`);
    process.exit(1);
  }

  // Sanitize the name
  const sanitizedName = sanitizeMigrationName(migrationName);

  // Check if migrations directory exists
  const migrationsDir = path.join(process.cwd(), "migrations");
  try {
    await fs.access(migrationsDir);
  } catch {
    console.error(
      "❌ Migrations directory not found. Make sure you're in the project root.",
    );
    process.exit(1);
  }

  // Generate migration template
  const template = generateMigrationTemplate(sanitizedName, description);

  // Check if migration already exists
  const exists = await checkMigrationExists(template.name, migrationsDir);
  if (exists) {
    console.error(`❌ Migration ${template.name} already exists`);
    process.exit(1);
  }

  // Create migration file
  const filePath = path.join(migrationsDir, `${template.name}.ts`);

  try {
    await fs.writeFile(filePath, template.content, "utf8");
    console.log(`✅ Created migration: ${template.name}.ts`);
    console.log(`   File: ${filePath}`);
    console.log(`   Description: ${description}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Edit the migration file to implement your changes`);
    console.log(`   2. Test locally: pnpm migrate up`);
    console.log(`   3. Apply to remote: pnpm migrate-remote up`);
  } catch (error) {
    console.error(`❌ Failed to create migration file:`, error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Generator error:", error);
  process.exit(1);
});
