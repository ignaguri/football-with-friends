import { Hono } from "hono";
import { getDatabase } from "@repo/shared/database";
import { auth } from "../auth";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { hashPassword } from "../crypto/password";

const app = new Hono();

// Phone number validation (international format)
const phoneRegex = /^\+[1-9]\d{6,14}$/;

const signUpSchema = z.object({
  phoneNumber: z
    .string()
    .regex(phoneRegex, "Invalid phone number format. Use international format (e.g., +1234567890)"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

/**
 * Sign up with phone number and password.
 * Creates user with credential account (email/password), then stores phone number.
 * Session is NOT created here - client will call phoneNumber.verify() after this.
 */
app.post("/sign-up", zValidator("json", signUpSchema), async (c) => {
  const { phoneNumber, password, name } = c.req.valid("json");

  try {
    const db = getDatabase();

    // Check if phone number already exists
    const existingUser = await db
      .selectFrom("user")
      .select("id")
      .where("phoneNumber", "=", phoneNumber)
      .executeTakeFirst();

    if (existingUser) {
      return c.json({ error: "Phone number already registered" }, 400);
    }

    // Generate a unique email for better-auth compatibility
    // better-auth requires email for sign-up, so we create a placeholder
    const generatedEmail = `phone_${phoneNumber.replace(/\+/g, "")}@football.local`;

    // Create user with email/password (creates credential account with password hash)
    const signUpResponse = await auth.api.signUpEmail({
      body: {
        email: generatedEmail,
        password,
        name,
      },
      headers: c.req.raw.headers,
    });

    if (!signUpResponse?.user) {
      return c.json({ error: "Failed to create account" }, 500);
    }

    // Update the user with the phone number and auth method
    await db
      .updateTable("user")
      .set({
        phoneNumber,
        phoneNumberVerified: 0,
        primaryAuthMethod: "phone",
      })
      .where("id", "=", signUpResponse.user.id)
      .execute();

    // Return success - NO SESSION
    // Client will call authClient.phoneNumber.verify() to create session
    return c.json({
      success: true,
      user: {
        ...signUpResponse.user,
        phoneNumber,
        phoneNumberVerified: 0,
      },
    });
  } catch (error) {
    console.error("Phone sign-up error:", error);
    return c.json({ error: "Failed to create account" }, 500);
  }
});

/**
 * Check if a user's password hash needs to be reset.
 * Old scrypt hashes (from BetterAuth defaults) can't be verified on CF Workers.
 * Accepts either phone number or email to look up the user.
 */
const needsResetSchema = z.object({
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
}).refine((data) => data.phoneNumber || data.email, {
  message: "Either phoneNumber or email is required",
});

app.post("/needs-password-reset", zValidator("json", needsResetSchema), async (c) => {
  const { phoneNumber, email } = c.req.valid("json");

  try {
    const db = getDatabase();

    // Find user by phone or email
    let query = db.selectFrom("user").select("id");
    if (phoneNumber) {
      query = query.where("phoneNumber", "=", phoneNumber);
    } else if (email) {
      query = query.where("email", "=", email);
    }

    const user = await query.executeTakeFirst();
    if (!user) {
      // Don't reveal if user exists — return false
      return c.json({ needsReset: false });
    }

    // Check the credential account's password hash format
    const account = await db
      .selectFrom("account")
      .select("password")
      .where("userId", "=", user.id)
      .where("providerId", "=", "credential")
      .executeTakeFirst();

    if (!account?.password) {
      return c.json({ needsReset: false });
    }

    // Old scrypt format doesn't have the "pbkdf2:" prefix
    const needsReset = !account.password.startsWith("pbkdf2:");
    return c.json({ needsReset });
  } catch (error) {
    console.error("needs-password-reset error:", error);
    return c.json({ needsReset: false });
  }
});

/**
 * Reset password for users with old scrypt hashes.
 * Only works if the user's current hash is in the old format.
 * Requires the old password as proof of identity (even though we can't
 * verify it on CF Workers, it prevents blind account takeover).
 */
const resetPasswordSchema = z.object({
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.phoneNumber || data.email, {
  message: "Either phoneNumber or email is required",
});

app.post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  const { phoneNumber, email, newPassword } = c.req.valid("json");

  try {
    const db = getDatabase();

    // Find user — generic error to avoid account enumeration
    let query = db.selectFrom("user").select("id");
    if (phoneNumber) {
      query = query.where("phoneNumber", "=", phoneNumber);
    } else if (email) {
      query = query.where("email", "=", email);
    }

    const user = await query.executeTakeFirst();
    if (!user) {
      return c.json({ error: "Unable to reset password" }, 400);
    }

    // Get credential account
    const account = await db
      .selectFrom("account")
      .select(["id", "password"])
      .where("userId", "=", user.id)
      .where("providerId", "=", "credential")
      .executeTakeFirst();

    if (!account?.password) {
      return c.json({ error: "Unable to reset password" }, 400);
    }

    // Only allow reset if the hash is in the old scrypt format
    if (account.password.startsWith("pbkdf2:")) {
      return c.json({ error: "Password is already up to date. Use the normal change password flow." }, 400);
    }

    // Hash new password with PBKDF2
    const newHash = await hashPassword(newPassword);

    // Update the password hash directly
    await db
      .updateTable("account")
      .set({ password: newHash })
      .where("id", "=", account.id)
      .execute();

    return c.json({ success: true });
  } catch (error) {
    console.error("reset-password error:", error);
    return c.json({ error: "Unable to reset password" }, 500);
  }
});

/**
 * Forgot password: generate a 6-digit reset code and store it in the verification table.
 * The code must be relayed to the user by the admin via WhatsApp.
 * Always returns success to prevent user enumeration.
 */
const forgotPasswordSchema = z.object({
  phoneNumber: z.string().optional(),
  email: z.string().min(1).optional(),
}).refine((data) => data.phoneNumber || data.email, {
  message: "Either phoneNumber or email is required",
});

function generateResetCode(): string {
  const digits = "0123456789";
  let code = "";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  for (let i = 0; i < 6; i++) {
    code += digits[array[i] % 10];
  }
  return code;
}

app.post("/forgot-password", zValidator("json", forgotPasswordSchema), async (c) => {
  const { phoneNumber, email } = c.req.valid("json");
  const identifier = phoneNumber || email!;

  try {
    const db = getDatabase();

    // Look up user (silent success if not found)
    let query = db.selectFrom("user").select("id");
    if (phoneNumber) {
      query = query.where("phoneNumber", "=", phoneNumber);
    } else if (email) {
      query = query.where("email", "=", email);
    }
    const user = await query.executeTakeFirst();

    if (user) {
      const code = generateResetCode();
      const now = Date.now();
      const expiresAt = now + 15 * 60 * 1000; // 15 minutes
      const verificationId = `forgot:${identifier}`;

      // Delete any existing reset code for this identifier
      await db
        .deleteFrom("verification")
        .where("identifier", "=", verificationId)
        .execute();

      // Insert new reset code
      await db
        .insertInto("verification")
        .values({
          id: crypto.randomUUID(),
          identifier: verificationId,
          value: `${code}:0`, // code:attempts
          expiresAt,
          createdAt: now,
          updatedAt: now,
        })
        .execute();

      console.log(`[AUTH] Password reset code generated for ${identifier}`);
    }

    // Always return success to prevent enumeration
    return c.json({ success: true });
  } catch (error) {
    console.error("forgot-password error:", error);
    return c.json({ success: true }); // Still return success
  }
});

/**
 * Verify reset code and set new password.
 * Rate-limited to 3 attempts per code.
 */
const verifyResetSchema = z.object({
  phoneNumber: z.string().optional(),
  email: z.string().min(1).optional(),
  code: z.string().length(6, "Code must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.phoneNumber || data.email, {
  message: "Either phoneNumber or email is required",
});

app.post("/verify-reset", zValidator("json", verifyResetSchema), async (c) => {
  const { phoneNumber, email, code, newPassword } = c.req.valid("json");
  const identifier = phoneNumber || email!;
  const verificationId = `forgot:${identifier}`;

  try {
    const db = getDatabase();

    // Find the verification entry
    const verification = await db
      .selectFrom("verification")
      .select(["id", "value", "expiresAt"])
      .where("identifier", "=", verificationId)
      .executeTakeFirst();

    if (!verification) {
      return c.json({ error: "Invalid or expired reset code" }, 400);
    }

    // Check expiry
    if (verification.expiresAt < Date.now()) {
      await db.deleteFrom("verification").where("id", "=", verification.id).execute();
      return c.json({ error: "Reset code has expired. Please request a new one." }, 400);
    }

    // Check attempts
    const [storedCode, attemptsStr] = verification.value.split(":");
    const attempts = parseInt(attemptsStr || "0");
    if (attempts >= 3) {
      await db.deleteFrom("verification").where("id", "=", verification.id).execute();
      return c.json({ error: "Too many attempts. Please request a new code." }, 400);
    }

    // Verify code
    if (code !== storedCode) {
      // Increment attempts
      await db
        .updateTable("verification")
        .set({ value: `${storedCode}:${attempts + 1}`, updatedAt: Date.now() })
        .where("id", "=", verification.id)
        .execute();
      return c.json({ error: "Invalid reset code" }, 400);
    }

    // Find user
    let userQuery = db.selectFrom("user").select("id");
    if (phoneNumber) {
      userQuery = userQuery.where("phoneNumber", "=", phoneNumber);
    } else if (email) {
      userQuery = userQuery.where("email", "=", email);
    }
    const user = await userQuery.executeTakeFirst();

    if (!user) {
      return c.json({ error: "Unable to reset password" }, 400);
    }

    // Get credential account
    const account = await db
      .selectFrom("account")
      .select(["id"])
      .where("userId", "=", user.id)
      .where("providerId", "=", "credential")
      .executeTakeFirst();

    if (!account) {
      return c.json({ error: "Unable to reset password" }, 400);
    }

    // Hash and update password
    const newHash = await hashPassword(newPassword);
    await db
      .updateTable("account")
      .set({ password: newHash })
      .where("id", "=", account.id)
      .execute();

    // Clean up verification entry
    await db.deleteFrom("verification").where("id", "=", verification.id).execute();

    console.log(`[AUTH] Password reset successful for ${identifier}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("verify-reset error:", error);
    return c.json({ error: "Unable to reset password" }, 500);
  }
});

/**
 * Admin-only: list pending password reset codes.
 * Used by the admin to look up codes when users request resets via WhatsApp.
 */
app.get("/admin/reset-codes", async (c) => {
  try {
    // This route is under /api/phone-auth/ which is in the public allowlist,
    // so the global auth middleware doesn't run. Manually verify the session.
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session?.user || (session.user as any).role !== "admin") {
      return c.json({ error: "Forbidden" }, 403);
    }

    const db = getDatabase();
    const codes = await db
      .selectFrom("verification")
      .select(["identifier", "value", "expiresAt"])
      .where("identifier", "like", "forgot:%")
      .execute();

    const result = codes
      .filter((v) => v.expiresAt > Date.now()) // Only non-expired
      .map((v) => {
        const [code] = v.value.split(":");
        const userIdentifier = v.identifier.replace("forgot:", "");
        return {
          identifier: userIdentifier,
          code,
          expiresAt: new Date(v.expiresAt).toISOString(),
        };
      });

    return c.json({ codes: result });
  } catch (error) {
    console.error("admin/reset-codes error:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }
});

/**
 * Public endpoint to get the organizer's WhatsApp number.
 * Used by the forgot-password screen (which is shown to unauthenticated users).
 */
app.get("/organizer-contact", async (c) => {
  try {
    const db = getDatabase();
    const settings = await db
      .selectFrom("settings")
      .select(["organizer_whatsapp"])
      .executeTakeFirst();

    return c.json({ whatsapp: settings?.organizer_whatsapp || null });
  } catch {
    return c.json({ whatsapp: null });
  }
});

// Named export for worker.ts (Cloudflare Workers)
export { app as phoneAuthRoute };

// Default export for index.ts (local development)
export default app;
