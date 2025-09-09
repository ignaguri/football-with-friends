#!/usr/bin/env tsx
// Migration CLI script

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";

// Load .env.local for local development, fallback to .env
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  // Dynamic import after environment is loaded
  const { MigrationRunner, MigrationError, MigrationStatusError } =
    await import("@/lib/database/migrator");

  const command = process.argv[2];
  const runner = new MigrationRunner();

  switch (command) {
    case "up":
    case "migrate":
      console.log("🚀 Running pending migrations...");
      try {
        const result = await runner.runPendingMigrations();
        if (result.error) {
          console.error("❌ Migration failed:", result.error);
          process.exit(1);
        }
        console.log("✅ All migrations completed successfully");
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
      console.log(`🔄 Rolling back ${steps} migration(s)...`);
      try {
        const result = await runner.rollback(steps);
        if (result.error) {
          console.error("❌ Rollback failed:", result.error);
          process.exit(1);
        }
        console.log("✅ Rollback completed successfully");
      } catch (error) {
        console.error("❌ Rollback failed:", error);
        process.exit(1);
      }
      break;

    case "status":
      console.log("📊 Checking migration status...");
      try {
        const status = await runner.getMigrationStatus();
        console.log("Migration status:", status);

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

    default:
      console.log(`
📋 Database Migration CLI

Usage:
  pnpm migrate up        # Run all pending migrations  
  pnpm migrate down [n]  # Rollback n migrations (default: 1)
  pnpm migrate status    # Check migration status

Examples:
  pnpm migrate up
  pnpm migrate down
  pnpm migrate down 2
  pnpm migrate status
      `);
      break;
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ CLI error:", error);
  process.exit(1);
});
