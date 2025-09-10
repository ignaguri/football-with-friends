#!/usr/bin/env tsx
// Remote migration CLI script for Turso database

// Load environment variables first
import { config } from "dotenv";

// Load .env.prod, fallback to .env
config({ path: ".env.production" });
config({ path: ".env" });

async function main() {
  // Dynamic import after environment is loaded
  const { MigrationRunner, MigrationError, MigrationStatusError } =
    await import("@/lib/database/migrator");
  const { getTursoEnv } = await import("@/lib/env");

  const command = process.argv[2];

  // Validate environment for remote migrations
  try {
    const tursoEnv = getTursoEnv();
    console.log("🔗 Connected to Turso database");
    console.log(
      `   Database URL: ${tursoEnv.TURSO_DATABASE_URL.replace(/\/\/.*@/, "//***@")}`,
    );
  } catch (error) {
    console.error("❌ Environment validation failed:");
    console.error(
      "   Make sure STORAGE_PROVIDER=turso and Turso credentials are set",
    );
    console.error("   Run 'pnpm env:check' to validate your environment");
    process.exit(1);
  }

  const runner = new MigrationRunner();

  switch (command) {
    case "up":
    case "migrate":
      console.log("🚀 Running pending migrations on remote database...");

      // Show current status before migration
      try {
        const status = await runner.getMigrationStatus();
        console.log(`\n📊 Current Status:`);
        console.log(`   Executed: ${status.executed.length} migrations`);
        console.log(`   Pending: ${status.pending.length} migrations`);

        if (status.pending.length === 0) {
          console.log("✅ No pending migrations to run");
          process.exit(0);
        }

        console.log(`\n⏳ Pending migrations:`);
        status.pending.forEach((migration) => {
          console.log(`   - ${migration}`);
        });

        // Confirmation prompt
        console.log(`\n⚠️  This will modify the remote Turso database.`);
        console.log(`   Make sure you have a backup if needed.`);
        console.log(`   Continue? (y/N)`);

        // Simple confirmation (in a real scenario, you might want to use readline)
        const readline = await import("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question("", resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
          console.log("❌ Migration cancelled");
          process.exit(0);
        }
      } catch (error) {
        console.error("❌ Failed to check migration status:", error);
        process.exit(1);
      }

      try {
        const result = await runner.runPendingMigrations();
        if (result.error) {
          console.error("❌ Migration failed:", result.error);
          process.exit(1);
        }
        console.log(
          "✅ All migrations completed successfully on remote database",
        );
      } catch (error) {
        if (error instanceof MigrationError) {
          console.error("❌ Migration error:", error.message);
          if (error.migrationName) {
            console.error(`   Migration: ${error.migrationName}`);
          }
          if (error.originalError) {
            console.error("   Original error:", error.originalError);
          }
        } else {
          console.error("❌ Migration failed:", error);
        }
        process.exit(1);
      }
      break;

    case "down":
    case "rollback":
      const steps = parseInt(process.argv[3]) || 1;
      console.log(
        `🔄 Rolling back ${steps} migration(s) on remote database...`,
      );

      // Show current status before rollback
      try {
        const status = await runner.getMigrationStatus();
        console.log(`\n📊 Current Status:`);
        console.log(`   Executed: ${status.executed.length} migrations`);

        if (status.executed.length === 0) {
          console.log("✅ No migrations to rollback");
          process.exit(0);
        }

        console.log(
          `\n⚠️  This will rollback ${steps} migration(s) on the remote Turso database.`,
        );
        console.log(
          `   This action cannot be undone without re-running migrations.`,
        );
        console.log(`   Continue? (y/N)`);

        const readline = await import("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question("", resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
          console.log("❌ Rollback cancelled");
          process.exit(0);
        }
      } catch (error) {
        console.error("❌ Failed to check migration status:", error);
        process.exit(1);
      }

      try {
        const result = await runner.rollback(steps);
        if (result.error) {
          console.error("❌ Rollback failed:", result.error);
          process.exit(1);
        }
        console.log("✅ Rollback completed successfully on remote database");
      } catch (error) {
        console.error("❌ Rollback failed:", error);
        process.exit(1);
      }
      break;

    case "status":
      console.log("📊 Checking remote migration status...");
      try {
        const status = await runner.getMigrationStatus();
        console.log("Remote migration status:", status);

        // Show detailed information
        const details = await runner.getMigrationDetails();
        console.log(`\n📋 Detailed Status:`);
        console.log(`   Executed: ${details.executed.length} migrations`);
        console.log(`   Pending: ${details.pending.length} migrations`);

        if (details.executed.length > 0) {
          console.log(`\n✅ Executed migrations:`);
          details.executed.forEach((m) => {
            console.log(`   - ${m.name} (${m.timestamp})`);
          });
        }

        if (details.pending.length > 0) {
          console.log(`\n⏳ Pending migrations:`);
          details.pending.forEach((m) => {
            console.log(`   - ${m.name}`);
          });
        }
      } catch (error) {
        if (error instanceof MigrationStatusError) {
          console.error("❌ Migration status error:", error.message);
          if (error.originalError) {
            console.error("   Original error:", error.originalError);
          }
        } else {
          console.error("❌ Failed to get migration status:", error);
        }
        process.exit(1);
      }
      break;

    case "dry-run":
      console.log("🔍 Dry run - checking what migrations would be executed...");
      try {
        const status = await runner.getMigrationStatus();
        console.log(`\n📊 Migration Status:`);
        console.log(`   Executed: ${status.executed.length} migrations`);
        console.log(`   Pending: ${status.pending.length} migrations`);

        if (status.pending.length === 0) {
          console.log("✅ No pending migrations to run");
        } else {
          console.log(`\n⏳ Would execute these migrations:`);
          status.pending.forEach((migration) => {
            console.log(`   - ${migration}`);
          });
        }
      } catch (error) {
        console.error("❌ Dry run failed:", error);
        process.exit(1);
      }
      break;

    default:
      console.log(`
📋 Remote Database Migration CLI

Usage:
  pnpm migrate-remote up        # Run all pending migrations on remote database
  pnpm migrate-remote down [n]  # Rollback n migrations on remote database (default: 1)
  pnpm migrate-remote status    # Check remote migration status
  pnpm migrate-remote dry-run   # Preview what migrations would be executed

Examples:
  pnpm migrate-remote up
  pnpm migrate-remote down
  pnpm migrate-remote down 2
  pnpm migrate-remote status
  pnpm migrate-remote dry-run

⚠️  These commands modify the remote Turso database.
   Make sure you have proper backups before running migrations.
      `);
      break;
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ CLI error:", error);
  process.exit(1);
});
