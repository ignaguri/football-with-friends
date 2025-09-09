// Database connection utility for Kysely with Turso/LibSQL

import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely } from "kysely";
import { env, getTursoEnv, getLocalDbEnv } from "@/lib/env";

import type { Database } from "./schema";

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