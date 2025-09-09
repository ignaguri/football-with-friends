#!/usr/bin/env tsx
// Migration CLI script

// Load environment variables first
import "dotenv/config";

import { MigrationRunner } from "@/lib/database/migrator";

async function main() {
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
        console.error("❌ Migration failed:", error);
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
      } catch (error) {
        console.error("❌ Failed to get migration status:", error);
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
