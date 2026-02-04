import { Hono } from "hono";
import { getDatabase } from "@repo/shared/database";
import { auth } from "../auth";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

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

// Named export for worker.ts (Cloudflare Workers)
export { app as phoneAuthRoute };

// Default export for index.ts (local development)
export default app;
