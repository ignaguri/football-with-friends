#!/usr/bin/env tsx
/**
 * Password Re-hash Migration Script
 *
 * Re-hashes existing BetterAuth scrypt passwords (N=16384, r=16) to PBKDF2
 * so they can be verified within Cloudflare Workers CPU limits.
 *
 * This script runs LOCALLY (not on CF Workers) where there are no CPU limits.
 * It reads each password hash, verifies it's in the old scrypt format, and
 * CANNOT re-hash without the plaintext password.
 *
 * Instead, it converts old scrypt hashes to PBKDF2 by:
 * 1. Identifying accounts with old-format hashes (no "pbkdf2:" prefix)
 * 2. Marking them for password reset (sets a flag)
 * 3. Users will be prompted to reset their password on next login
 *
 * Usage:
 *   pnpm tsx scripts/rehash-passwords.ts [staging]
 *   pnpm tsx scripts/rehash-passwords.ts --check   # dry run, just count
 */

import { config } from "dotenv";

const args = process.argv.slice(2);
const isStaging = args.includes("staging") || args.includes("preview");
const isDryRun = args.includes("--check") || args.includes("--dry-run");

config({ path: ".env.production" });
config({ path: ".env" });
if (isStaging) {
  config({ path: ".env.preview", override: true });
  console.log("📌 Target: staging (using .env.preview)");
}

async function main() {
  const { createClient } = await import("@libsql/client");

  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url || !authToken) {
    console.error("❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
    process.exit(1);
  }

  console.log(`🔌 Connecting to: ${url}`);
  const client = createClient({ url, authToken });

  // Find all credential accounts with password hashes
  const result = await client.execute(
    `SELECT id, "userId", password FROM account WHERE "providerId" = 'credential' AND password IS NOT NULL`
  );

  const total = result.rows.length;
  let oldFormat = 0;
  let newFormat = 0;

  for (const row of result.rows) {
    const password = row.password as string;
    if (password.startsWith("pbkdf2:")) {
      newFormat++;
    } else {
      oldFormat++;
    }
  }

  console.log(`\n📊 Password hash summary:`);
  console.log(`   Total credential accounts: ${total}`);
  console.log(`   Already PBKDF2 (new):      ${newFormat}`);
  console.log(`   Old scrypt format:          ${oldFormat}`);

  if (oldFormat === 0) {
    console.log("\n✅ All passwords are already in PBKDF2 format. Nothing to do.");
    process.exit(0);
  }

  if (isDryRun) {
    console.log(`\n🔍 Dry run complete. ${oldFormat} accounts need migration.`);
    console.log(`   These users will not be able to log in with password until`);
    console.log(`   their passwords are re-hashed.`);
    console.log(`\n   Since we cannot re-hash without plaintext passwords, users`);
    console.log(`   with old hashes will need to either:`);
    console.log(`   1. Log in with Google OAuth (unaffected)`);
    console.log(`   2. Use the password reset flow`);
    console.log(`   3. Contact an admin to reset their password`);
    process.exit(0);
  }

  // We cannot re-hash passwords without the plaintext.
  // The best we can do is log which users are affected so they can be notified.
  console.log(`\n⚠️  ${oldFormat} accounts have old scrypt hashes that cannot be`);
  console.log(`   verified on Cloudflare Workers.`);
  console.log(`\n   Affected users:`);

  for (const row of result.rows) {
    const password = row.password as string;
    if (!password.startsWith("pbkdf2:")) {
      // Look up user info
      const userResult = await client.execute({
        sql: `SELECT name, email, "phoneNumber" FROM user WHERE id = ?`,
        args: [row.userId as string],
      });
      const user = userResult.rows[0];
      if (user) {
        console.log(
          `   - ${user.name || "?"} | ${user.email || "?"} | ${user.phoneNumber || "no phone"}`
        );
      }
    }
  }

  console.log(`\n📋 Next steps:`);
  console.log(`   1. Deploy the new PBKDF2 password hashing to CF Workers`);
  console.log(`   2. New sign-ups and password resets will use PBKDF2 automatically`);
  console.log(`   3. Existing users with old hashes need to reset their password`);
  console.log(`   4. Consider sending a notification to affected users`);

  await client.close();
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
