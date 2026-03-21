/**
 * Custom password hashing for Cloudflare Workers.
 *
 * BetterAuth's default uses scrypt with N=16384, r=16 which exceeds
 * Cloudflare Workers' CPU time limit (10ms free, 50ms paid).
 *
 * This module uses PBKDF2 via the Web Crypto API (native to CF Workers)
 * for new hashes, and logs a warning for old scrypt hashes that can't be
 * verified within CPU limits.
 *
 * Hash format:
 *   New:  "pbkdf2:<iterations>:<salt_hex>:<key_hex>"
 *   Old:  "<salt_hex>:<key_hex>" (BetterAuth scrypt — user must reset password)
 */

// PBKDF2 config — 100k iterations is OWASP recommended for SHA-256
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH = 32; // 256 bits
const PBKDF2_HASH = "SHA-256";
const SALT_LENGTH = 16; // 128-bit salt

function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexDecode(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i]! ^ b[i]!;
  }
  return result === 0;
}

// Use `any` for Web Crypto API params to avoid Node.js vs CF Workers type conflicts
async function pbkdf2DeriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password) as any,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH * 8
  );

  return new Uint8Array(derivedBits);
}

/**
 * Hash a password using PBKDF2 (Web Crypto API).
 * Produces format: "pbkdf2:<iterations>:<salt_hex>:<key_hex>"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await pbkdf2DeriveKey(password, salt);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${hexEncode(salt)}:${hexEncode(key)}`;
}

/**
 * Verify a password against a hash.
 * Supports new PBKDF2 hashes. Old BetterAuth scrypt hashes (N=16384, r=16)
 * cannot be verified on CF Workers — users with old hashes must reset.
 */
export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  // New PBKDF2 format: "pbkdf2:<iterations>:<salt>:<key>"
  if (hash.startsWith("pbkdf2:")) {
    const parts = hash.split(":");
    if (parts.length !== 4) return false;

    const iterations = parseInt(parts[1]!, 10);
    const salt = hexDecode(parts[2]!);
    const expectedKey = hexDecode(parts[3]!);

    const derivedKey = await pbkdf2DeriveKey(password, salt, iterations);
    return constantTimeEqual(derivedKey, expectedKey);
  }

  // Old BetterAuth scrypt format: "<salt_hex>:<key_hex>"
  // These hashes use scrypt N=16384, r=16 which EXCEEDS CF Workers CPU limits.
  // They cannot be verified here — users must reset their password.
  console.warn(
    `[auth] Old scrypt password hash detected (no "pbkdf2:" prefix). ` +
      `This hash cannot be verified on Cloudflare Workers due to CPU limits. ` +
      `User needs to reset their password.`
  );
  return false;
}
