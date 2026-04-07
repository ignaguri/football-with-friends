#!/usr/bin/env node
/**
 * Generate Apple Client Secret JWT for Sign in with Apple.
 *
 * Apple client secrets are ES256-signed JWTs that expire after max 6 months.
 * Re-run this script and update the Cloudflare Workers secret when it expires.
 *
 * Usage: node scripts/generate-apple-secret.mjs
 */

import { SignJWT, importPKCS8 } from "jose";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration — update these if they change
const TEAM_ID = "4Q9U9B3BKC";
const KEY_ID = "458VVSTX4T";
const CLIENT_ID = "com.pepegrillo.football-with-friends"; // Apple Services ID
const KEY_FILE = resolve(__dirname, "../certificates/AuthKey_458VVSTX4T.p8");

// Max validity: 6 months (Apple's limit)
const EXPIRY_DAYS = 180;

async function generateClientSecret() {
  const privateKeyPem = readFileSync(KEY_FILE, "utf8");
  const privateKey = await importPKCS8(privateKeyPem, "ES256");

  const now = Math.floor(Date.now() / 1000);

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
    .setIssuer(TEAM_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + EXPIRY_DAYS * 24 * 60 * 60)
    .setAudience("https://appleid.apple.com")
    .setSubject(CLIENT_ID)
    .sign(privateKey);

  const expiryDate = new Date((now + EXPIRY_DAYS * 24 * 60 * 60) * 1000);

  console.log("=== Apple Client Secret Generated ===\n");
  console.log(jwt);
  console.log(`\nExpires: ${expiryDate.toISOString()} (${EXPIRY_DAYS} days)\n`);
  console.log("To update Cloudflare Workers secret:");
  console.log("  cd apps/api && echo '<paste jwt>' | wrangler secret put APPLE_CLIENT_SECRET");
  console.log("  cd apps/api && echo '<paste jwt>' | wrangler secret put APPLE_CLIENT_SECRET --env=preview");
}

generateClientSecret().catch(console.error);
