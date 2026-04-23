// Test database harness.
//
// Spins up an in-memory libsql database, runs all migrations, and returns the
// shared Kysely singleton the repositories already use under the hood. We
// install env vars BEFORE importing any `@repo/shared` module so the env
// proxy and the repository factory both see a local-db configuration.

import path from "node:path";
import { promises as fs } from "node:fs";
import {
  FileMigrationProvider,
  Migrator as KyselyMigrator,
  type Kysely,
} from "kysely";

// Install env vars the moment this module is imported. Test files import
// this module before anything else; the shared env proxy is lazy so values
// set here propagate to getDatabase()/getRepositoryFactory() on first use.
process.env.STORAGE_PROVIDER = "local-db";
// `file::memory:` is libsql's in-memory URL shape (see @libsql/core/config.js).
// Each libsql connection gets its own memory DB, but we only ever create one
// Kysely singleton per test file (see getDatabase() below), so that is fine.
process.env.LOCAL_DATABASE_URL = "file::memory:";
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ||
  "test-secret-0123456789abcdef0123456789abcdef";
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret";
process.env.NODE_ENV = process.env.NODE_ENV || "test";

import {
  closeDatabase,
  getDatabase,
  resetDatabase,
} from "@repo/shared/database";
import { resetEnvCache } from "@repo/shared/env";
import { resetRepositoryFactory } from "@repo/shared/repositories";

// Resolve absolute path to the repository-root /migrations directory. apps/api
// sits two levels below the repo root.
const MIGRATIONS_DIR = path.resolve(
  new URL(".", import.meta.url).pathname,
  "../../../../../migrations",
);

// Ignacio's user id — used both by the legacy-group backfill migration and
// by tests that need a platform-admin persona. Kept stable so assertions
// read clean.
export const PLATFORM_ADMIN_USER_ID = "user_platform_admin";
export const PLATFORM_ADMIN_EMAIL = "ignacioguri@gmail.com";
export const LEGACY_GROUP_ID = "grp_legacy";

// Last migration whose `up` runs safely on an empty DB (everything before the
// legacy-group backfill, which expects Ignacio's user row to already exist).
const LAST_PRE_BACKFILL_MIGRATION = "20260422120000-create-group-tables";

/**
 * Create a test database: in-memory libsql, all migrations applied, with
 * Ignacio's account seeded between migrations so the legacy-group backfill
 * passes. Returns the same Kysely singleton the production repositories use
 * (via `getDatabase()`), which means `new TursoGroupRepository()` etc. just
 * work.
 */
export async function makeTestDb(): Promise<{
  db: Kysely<any>;
  cleanup: () => Promise<void>;
}> {
  // Reset any cached singletons from a prior test file. These live at module
  // scope in @repo/shared so without resetting the second test file would see
  // a stale connection + factory.
  resetEnvCache();
  resetDatabase();
  resetRepositoryFactory();

  const db = getDatabase() as unknown as Kysely<any>;

  const migrator = new KyselyMigrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: MIGRATIONS_DIR,
    }),
  });

  // Step 1a: migrate up through add-notification-tracking (creates the
  // `lastEngagementReminderAt` column already in camelCase).
  const preRename = await migrator.migrateTo(
    "20260408120000-add-notification-tracking",
  );
  if (preRename.error) {
    throw new Error(
      `Pre-rename migrations failed: ${
        preRename.error instanceof Error
          ? preRename.error.message
          : String(preRename.error)
      }`,
    );
  }

  // Step 1b: skip 20260408130000-rename-engagement-column. On a fresh DB the
  // previous migration already wrote the camelCase name, so the rename's `up`
  // fails with "no such column: last_engagement_reminder_at". (Pre-existing
  // production migration bug — see docs/docs/superpowers.) We insert a matching
  // row into kysely_migration so the migrator treats it as applied and moves on.
  await db
    .insertInto("kysely_migration" as any)
    .values({
      name: "20260408130000-rename-engagement-column",
      timestamp: new Date().toISOString(),
    } as any)
    .execute();

  // Step 1c: run remaining migrations up to the one right before legacy-group
  // backfill (which needs Ignacio's user row).
  const pre = await migrator.migrateTo(LAST_PRE_BACKFILL_MIGRATION);
  if (pre.error) {
    throw new Error(
      `Pre-backfill migrations failed: ${
        pre.error instanceof Error ? pre.error.message : String(pre.error)
      }`,
    );
  }

  // Step 2: seed Ignacio's account — required by the legacy-group backfill
  // and the user-role migration. Platform role starts as 'admin' and
  // remains 'admin' post-migration (the migration demotes OTHER admins).
  const now = Date.now();
  await db
    .insertInto("user")
    .values({
      id: PLATFORM_ADMIN_USER_ID,
      name: "Ignacio (test)",
      email: PLATFORM_ADMIN_EMAIL,
      emailVerified: 1,
      image: null,
      role: "admin",
      banned: null,
      banReason: null,
      banExpires: null,
      createdAt: now,
      updatedAt: now,
      username: null,
      displayUsername: null,
      profilePicture: null,
      nationality: null,
      phoneNumber: null,
      phoneNumberVerified: 0,
      primaryAuthMethod: null,
      lastEngagementReminderAt: null,
    })
    .execute();

  // Step 3: run the rest.
  const rest = await migrator.migrateToLatest();
  if (rest.error) {
    throw new Error(
      `Post-backfill migrations failed: ${
        rest.error instanceof Error ? rest.error.message : String(rest.error)
      }`,
    );
  }

  const cleanup = async () => {
    await closeDatabase();
    resetDatabase();
    resetRepositoryFactory();
  };

  return { db, cleanup };
}
