// Database connection utility for Kysely with Turso/LibSQL

import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely } from "kysely";

import type { Database } from "./schema";

// Database connection configuration
export function createDatabase(): Kysely<Database> {
  const storageProvider = process.env.STORAGE_PROVIDER || 'google-sheets';
  
  if (storageProvider === 'local-db') {
    // Local SQLite database for development
    const libsql = new LibsqlDialect({
      url: process.env.LOCAL_DATABASE_URL || "file:./local.db",
    });

    return new Kysely<Database>({
      dialect: libsql,
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    });
  } else {
    // Production Turso database
    const libsql = new LibsqlDialect({
      url: process.env.TURSO_DATABASE_URL || "",
      authToken: process.env.TURSO_AUTH_TOKEN || "",
    });

    return new Kysely<Database>({
      dialect: libsql,
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    });
  }
}

// Global database instance
let db: Kysely<Database> | null = null;

/**
 * Get the global database instance
 */
export function getDatabase(): Kysely<Database> {
  if (!db) {
    db = createDatabase();
  }
  return db;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}

/**
 * Reset database connection (useful for testing)
 */
export function resetDatabase(): void {
  db = null;
}