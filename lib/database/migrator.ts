// Database migration system for Kysely

import { promises as fs } from "fs";
import * as path from "path";
import { FileMigrationProvider, Migrator as KyselyMigrator, type MigrationResult } from "kysely";

import { getDatabase } from "./connection";

export class MigrationRunner {
  private migrator: KyselyMigrator;

  constructor(migrationFolder?: string) {
    const db = getDatabase();
    const migrationsPath = migrationFolder || path.join(process.cwd(), "migrations");

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
  async runPendingMigrations(): Promise<{
    error?: Error;
    results?: MigrationResult[];
  }> {
    const result = await this.migrator.migrateToLatest();

    if (result.results) {
      result.results.forEach((migrationResult) => {
        if (migrationResult.status === 'Success') {
          console.log(`✅ Migration "${migrationResult.migrationName}" executed successfully`);
        } else if (migrationResult.status === 'Error') {
          console.error(`❌ Failed to execute migration "${migrationResult.migrationName}"`);
        }
      });
    }

    if (result.error) {
      console.error('Failed to migrate:', result.error);
    }

    return result;
  }

  /**
   * Rollback migrations
   */
  async rollback(steps: number = 1): Promise<{
    error?: Error;
    results?: MigrationResult[];
  }> {
    const result = await this.migrator.migrateDown();

    if (result.results) {
      result.results.forEach((migrationResult) => {
        if (migrationResult.status === 'Success') {
          console.log(`↩️ Migration "${migrationResult.migrationName}" rolled back successfully`);
        } else if (migrationResult.status === 'Error') {
          console.error(`❌ Failed to rollback migration "${migrationResult.migrationName}"`);
        }
      });
    }

    return result;
  }

  /**
   * Get migration status
   */
  async getMigrationStatus() {
    const db = getDatabase();
    
    try {
      // Check if migration table exists
      const tables = await db.introspection.getTables();
      const migrationTable = tables.find(table => 
        table.name === 'kysely_migration' || 
        table.name === 'kysely_migrations'
      );

      if (!migrationTable) {
        return { executed: [], pending: [] };
      }

      // Get executed migrations (this is implementation-specific)
      // For now, we'll return a basic status
      return { status: 'ready' };
    } catch (error) {
      console.error('Error checking migration status:', error);
      return { error };
    }
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
export async function rollbackMigrations(steps: number = 1, migrationFolder?: string): Promise<void> {
  const runner = new MigrationRunner(migrationFolder);
  const result = await runner.rollback(steps);
  
  if (result.error) {
    throw result.error;
  }
}