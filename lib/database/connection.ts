// Database connection utility for Kysely with Turso/LibSQL

import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely } from "kysely";

import type { Database, ExtendedDatabase } from "./schema";

import { env, getTursoEnv, getLocalDbEnv } from "@/lib/env";

// Database connection configuration
export function createDatabase(): Kysely<Database> {
  const { STORAGE_PROVIDER, NODE_ENV } = env;

  if (STORAGE_PROVIDER === "local-db") {
    // Local SQLite database for development
    const localDbEnv = getLocalDbEnv();
    const libsql = new LibsqlDialect({
      url: localDbEnv.LOCAL_DATABASE_URL,
    });

    return new Kysely<Database>({
      dialect: libsql,
      log: NODE_ENV === "development" ? ["query"] : [],
    });
  } else {
    // Production Turso database
    const tursoEnv = getTursoEnv();
    const libsql = new LibsqlDialect({
      url: tursoEnv.TURSO_DATABASE_URL,
      authToken: tursoEnv.TURSO_AUTH_TOKEN,
    });

    return new Kysely<Database>({
      dialect: libsql,
      log: NODE_ENV === "development" ? ["query"] : [],
    });
  }
}

// Global database instance
let db: Kysely<Database> | null = null;
let extendedDb: Kysely<ExtendedDatabase> | null = null;

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
 * Create an extended database instance (includes SQLite system tables)
 * This is useful for migrations and database introspection
 */
function createExtendedDatabase(): Kysely<ExtendedDatabase> {
  const { STORAGE_PROVIDER, NODE_ENV } = env;

  if (STORAGE_PROVIDER === "local-db") {
    // Local SQLite database for development
    const localDbEnv = getLocalDbEnv();
    const libsql = new LibsqlDialect({
      url: localDbEnv.LOCAL_DATABASE_URL,
    });

    return new Kysely<ExtendedDatabase>({
      dialect: libsql,
      log: NODE_ENV === "development" ? ["query"] : [],
    });
  } else {
    // Production Turso database
    const tursoEnv = getTursoEnv();
    const libsql = new LibsqlDialect({
      url: tursoEnv.TURSO_DATABASE_URL,
      authToken: tursoEnv.TURSO_AUTH_TOKEN,
    });

    return new Kysely<ExtendedDatabase>({
      dialect: libsql,
      log: NODE_ENV === "development" ? ["query"] : [],
    });
  }
}

/**
 * Get the global extended database instance (includes SQLite system tables)
 * This is useful for migrations and database introspection
 */
export function getExtendedDatabase(): Kysely<ExtendedDatabase> {
  if (!extendedDb) {
    extendedDb = createExtendedDatabase();
  }
  return extendedDb;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
  if (extendedDb) {
    await extendedDb.destroy();
    extendedDb = null;
  }
}

/**
 * Reset database connection (useful for testing)
 */
export function resetDatabase(): void {
  db = null;
  extendedDb = null;
}
