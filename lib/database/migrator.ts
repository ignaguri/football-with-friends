// Database migration system for Kysely

import { promises as fs } from "fs";
import {
  FileMigrationProvider,
  Migrator as KyselyMigrator,
  type MigrationResult,
  type Migration,
  sql,
} from "kysely";
import * as path from "path";

import { getDatabase } from "./connection";

/**
 * Status of database migrations
 */
export interface MigrationStatus {
  /** List of migration names that have been executed */
  executed: string[];
  /** List of migration names that are pending execution */
  pending: string[];
  /** Error that occurred while checking migration status */
  error?: unknown;
}

/**
 * Result of running migrations
 */
export interface MigrationRunResult {
  /** Error that occurred during migration execution */
  error?: unknown;
  /** Results of individual migration executions */
  results?: MigrationResult[];
}

/**
 * Record of an executed migration in the database
 */
interface ExecutedMigration {
  /** Name of the migration file */
  name: string;
  /** ISO timestamp when the migration was executed */
  timestamp: string;
}

/**
 * Information about a migration file
 */
export interface MigrationFileInfo {
  /** Name of the migration file */
  name: string;
  /** The migration object with up/down functions */
  migration: Migration;
  /** When this migration was executed (if executed) */
  executedAt?: Date;
}

/**
 * Error thrown when a migration execution fails
 */
export class MigrationError extends Error {
  constructor(
    message: string,
    /** Name of the migration that failed */
    public readonly migrationName?: string,
    /** The original error that caused the failure */
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "MigrationError";
  }
}

/**
 * Error thrown when checking migration status fails
 */
export class MigrationStatusError extends Error {
  constructor(
    message: string,
    /** The original error that caused the failure */
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "MigrationStatusError";
  }
}

export class MigrationRunner {
  private migrator: KyselyMigrator;

  constructor(migrationFolder?: string) {
    const db = getDatabase();
    const migrationsPath =
      migrationFolder || path.join(process.cwd(), "migrations");

    this.migrator = new KyselyMigrator({
      db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: migrationsPath,
      }),
    });
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(): Promise<MigrationRunResult> {
    const result = await this.migrator.migrateToLatest();

    if (result.results) {
      result.results.forEach((migrationResult: MigrationResult) => {
        if (migrationResult.status === "Success") {
          console.log(
            `✅ Migration "${migrationResult.migrationName}" executed successfully`,
          );
        } else if (migrationResult.status === "Error") {
          console.error(
            `❌ Failed to execute migration "${migrationResult.migrationName}"`,
          );
        }
      });
    }

    if (result.error) {
      console.error("Failed to migrate:", result.error);
      throw new MigrationError("Migration failed", undefined, result.error);
    }

    return result;
  }

  /**
   * Rollback migrations
   */
  async rollback(_steps: number = 1): Promise<MigrationRunResult> {
    const result = await this.migrator.migrateDown();

    if (result.results) {
      result.results.forEach((migrationResult: MigrationResult) => {
        if (migrationResult.status === "Success") {
          console.log(
            `↩️ Migration "${migrationResult.migrationName}" rolled back successfully`,
          );
        } else if (migrationResult.status === "Error") {
          console.error(
            `❌ Failed to rollback migration "${migrationResult.migrationName}"`,
          );
        }
      });
    }

    return result;
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<MigrationStatus> {
    const db = getDatabase();

    try {
      // Try to get executed migrations directly using raw SQL
      let executedMigrations: ExecutedMigration[] = [];
      try {
        const result = await sql<ExecutedMigration>`
          SELECT name, timestamp FROM kysely_migration ORDER BY timestamp ASC
        `.execute(db);
        executedMigrations = result.rows;
      } catch {
        return { executed: [], pending: [] };
      }

      // Get all migration files
      const migrationFiles = await this.migrator.getMigrations();

      const executedNames = executedMigrations.map((m) => m.name);
      const pending = migrationFiles.filter(
        (m) => !executedNames.includes(m.name),
      );

      return {
        executed: executedMigrations.map((m) => m.name),
        pending: pending.map((m) => m.name),
      };
    } catch (error) {
      console.error("Error checking migration status:", error);
      throw new MigrationStatusError("Failed to get migration status", error);
    }
  }

  /**
   * Get detailed migration information
   */
  async getMigrationDetails(): Promise<{
    executed: ExecutedMigration[];
    pending: MigrationFileInfo[];
  }> {
    const status = await this.getMigrationStatus();
    const migrationFiles = await this.migrator.getMigrations();

    const executedMigrations: ExecutedMigration[] = [];
    const pendingMigrations: MigrationFileInfo[] = [];

    for (const file of migrationFiles) {
      if (status.executed.includes(file.name)) {
        // Get execution timestamp from database
        const db = getDatabase();
        const result = await sql<ExecutedMigration>`
          SELECT name, timestamp FROM kysely_migration WHERE name = ${file.name}
        `.execute(db);

        const record = result.rows[0] as ExecutedMigration | undefined;
        if (record) {
          executedMigrations.push({
            name: record.name,
            timestamp: record.timestamp,
          });
        }
      } else {
        pendingMigrations.push(file);
      }
    }

    return {
      executed: executedMigrations,
      pending: pendingMigrations,
    };
  }

  /**
   * Check if a specific migration has been executed
   */
  async isMigrationExecuted(migrationName: string): Promise<boolean> {
    const status = await this.getMigrationStatus();
    return status.executed.includes(migrationName);
  }

  /**
   * Get the count of pending migrations
   */
  async getPendingMigrationCount(): Promise<number> {
    const status = await this.getMigrationStatus();
    return status.pending.length;
  }
}

/**
 * Convenient function to run migrations
 */
export async function runMigrations(migrationFolder?: string): Promise<void> {
  const runner = new MigrationRunner(migrationFolder);
  const result = await runner.runPendingMigrations();

  if (result.error) {
    throw result.error;
  }
}

/**
 * Convenient function to rollback migrations
 */
export async function rollbackMigrations(
  steps: number = 1,
  migrationFolder?: string,
): Promise<void> {
  const runner = new MigrationRunner(migrationFolder);
  const result = await runner.rollback(steps);

  if (result.error) {
    throw result.error;
  }
}
