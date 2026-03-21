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
 * No current password required (it can't be verified anyway).
 */
const resetPasswordSchema = z.object({
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.phoneNumber || data.email, {
  message: "Either phoneNumber or email is required",
});

app.post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  const { phoneNumber, email, newPassword } = c.req.valid("json");

  try {
    const db = getDatabase();

    // Find user
    let query = db.selectFrom("user").select("id");
    if (phoneNumber) {
      query = query.where("phoneNumber", "=", phoneNumber);
    } else if (email) {
      query = query.where("email", "=", email);
    }

    const user = await query.executeTakeFirst();
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get credential account
    const account = await db
      .selectFrom("account")
      .select(["id", "password"])
      .where("userId", "=", user.id)
      .where("providerId", "=", "credential")
      .executeTakeFirst();

    if (!account?.password) {
      return c.json({ error: "No password account found" }, 400);
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
    return c.json({ error: "Failed to reset password" }, 500);
  }
});

// Named export for worker.ts (Cloudflare Workers)
export { app as phoneAuthRoute };

// Default export for index.ts (local development)
export default app;
