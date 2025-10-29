#!/usr/bin/env tsx
// Script to download a Turso database locally for development/testing

import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

interface DownloadOptions {
  database: string;
  outputFile?: string;
  overwrite?: boolean;
}

async function downloadDatabase(options: DownloadOptions) {
  const {
    database,
    outputFile = `${database}-local.db`,
    overwrite = false,
  } = options;

  const dbPath = join(process.cwd(), outputFile);

  console.log(`📥 Downloading Turso database: ${database}\n`);

  // Check if file exists
  if (existsSync(dbPath)) {
    if (!overwrite) {
      console.error(`❌ File ${outputFile} already exists!`);
      console.error(`   Use --overwrite to replace it\n`);
      process.exit(1);
    }
    console.log(`⚠️  Removing existing file: ${outputFile}`);
    unlinkSync(dbPath);
  }

  try {
    // Step 1: Create SQL dump from Turso
    console.log(`1️⃣  Creating database dump from Turso...`);
    const dumpCommand = `turso db shell ${database} .dump`;

    const { stdout: dumpData, stderr: dumpError } = await execAsync(dumpCommand);

    if (dumpError && !dumpData) {
      throw new Error(`Failed to create dump: ${dumpError}`);
    }

    console.log(`   ✅ Dump created (${(dumpData.length / 1024).toFixed(2)} KB)\n`);

    // Step 2: Import dump into local SQLite database
    console.log(`2️⃣  Creating local SQLite database: ${outputFile}`);

    // Write dump data to temp file, then import
    const { writeFileSync } = await import("fs");
    const tempDumpFile = `${outputFile}.dump.sql`;
    writeFileSync(tempDumpFile, dumpData);

    const importCommand = `sqlite3 ${dbPath} < ${tempDumpFile}`;
    await execAsync(importCommand);

    // Clean up temp file
    unlinkSync(tempDumpFile);

    console.log(`   ✅ Local database created\n`);

    // Step 3: Verify database
    console.log(`3️⃣  Verifying database...`);
    const verifyCommand = `sqlite3 ${dbPath} "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"`;
    const { stdout: tables } = await execAsync(verifyCommand);

    const tableList = tables.trim().split('\n').filter(t => t);
    console.log(`   ✅ Found ${tableList.length} tables:\n`);
    tableList.forEach(table => {
      console.log(`      • ${table}`);
    });

    // Step 4: Show database stats
    console.log(`\n4️⃣  Database statistics:`);

    // Get row counts for main tables
    const mainTables = ['matches', 'signups', 'locations', 'user'];
    for (const table of mainTables) {
      if (tableList.includes(table)) {
        const countCommand = `sqlite3 ${dbPath} "SELECT COUNT(*) FROM ${table};"`;
        try {
          const { stdout: count } = await execAsync(countCommand);
          console.log(`   ${table}: ${count.trim()} rows`);
        } catch {
          // Table might not exist, skip
        }
      }
    }

    console.log(`\n✅ Download complete!\n`);
    console.log(`📂 Database saved to: ${outputFile}`);
    console.log(`📊 File size: ${(await getFileSize(dbPath) / 1024).toFixed(2)} KB\n`);
    console.log(`💡 To use this database locally:`);
    console.log(`   1. Update your .env.local:`);
    console.log(`      STORAGE_PROVIDER=local-db`);
    console.log(`      LOCAL_DATABASE_URL=file:./${outputFile}`);
    console.log(`   2. Run your app: pnpm dev\n`);
    console.log(`🔍 To inspect the database:`);
    console.log(`   sqlite3 ${outputFile}`);
    console.log(`   turso dev --db-file ${outputFile}\n`);

  } catch (error) {
    console.error(`\n❌ Error downloading database:`, error);
    process.exit(1);
  }
}

async function getFileSize(path: string): Promise<number> {
  const { statSync } = await import("fs");
  return statSync(path).size;
}

function printUsage() {
  console.log(`
📚 Usage: pnpm download-db [database-name] [options]

Arguments:
  database-name    Name of the Turso database to download (required)

Options:
  --output, -o     Output filename (default: [database-name]-local.db)
  --overwrite      Overwrite existing file if present
  --help, -h       Show this help message

Examples:
  # Download production database
  pnpm download-db football-with-friends

  # Download test branch database
  pnpm download-db football-with-friends-test-notifications

  # Download with custom filename
  pnpm download-db football-with-friends --output my-local-db.db

  # Overwrite existing file
  pnpm download-db football-with-friends --overwrite

Available databases:
`);

  // List available databases
  exec("turso db list", (error, stdout) => {
    if (!error) {
      console.log(stdout);
    }
  });
}

// Parse command line arguments
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const database = args[0];
  const options: DownloadOptions = { database };

  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--output" || arg === "-o") {
      options.outputFile = args[++i];
    } else if (arg === "--overwrite") {
      options.overwrite = true;
    }
  }

  await downloadDatabase(options);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
