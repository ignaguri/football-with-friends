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

const signInSchema = z.object({
  phoneNumber: z
    .string()
    .regex(phoneRegex, "Invalid phone number format. Use international format (e.g., +1234567890)"),
  password: z.string().min(1, "Password is required"),
});

// Sign up with phone number
// Creates a user with a generated email (phone@football.local) for better-auth compatibility
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

    // Use better-auth's sign-up endpoint with the generated email
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

    // Update the user with the phone number
    await db
      .updateTable("user")
      .set({
        phoneNumber,
        phoneNumberVerified: 0,
      })
      .where("id", "=", signUpResponse.user.id)
      .execute();

    // Return session info
    return c.json({
      user: {
        ...signUpResponse.user,
        phoneNumber,
        phoneNumberVerified: 0,
      },
      session: (signUpResponse as any).session,
    });
  } catch (error) {
    console.error("Phone sign-up error:", error);
    return c.json({ error: "Failed to create account" }, 500);
  }
});

// Sign in with phone number
app.post("/sign-in", zValidator("json", signInSchema), async (c) => {
  const { phoneNumber, password } = c.req.valid("json");

  try {
    const db = getDatabase();

    // Find user by phone number
    const user = await db
      .selectFrom("user")
      .select(["id", "email", "name", "phoneNumber"])
      .where("phoneNumber", "=", phoneNumber)
      .executeTakeFirst();

    if (!user) {
      return c.json({ error: "Invalid phone number or password" }, 401);
    }

    // Use better-auth's sign-in with the user's email
    const signInResponse = await auth.api.signInEmail({
      body: {
        email: user.email,
        password,
      },
      headers: c.req.raw.headers,
    });

    if (!(signInResponse as any)?.session) {
      return c.json({ error: "Invalid phone number or password" }, 401);
    }

    return c.json(signInResponse);
  } catch (error) {
    console.error("Phone sign-in error:", error);
    // Return generic error to prevent phone number enumeration
    return c.json({ error: "Invalid phone number or password" }, 401);
  }
});

// Check if phone number is available
app.get("/check-phone", async (c) => {
  const phoneNumber = c.req.query("phoneNumber");

  if (!phoneNumber) {
    return c.json({ error: "Phone number is required" }, 400);
  }

  if (!phoneRegex.test(phoneNumber)) {
    return c.json({ error: "Invalid phone number format" }, 400);
  }

  try {
    const db = getDatabase();

    const existingUser = await db
      .selectFrom("user")
      .select("id")
      .where("phoneNumber", "=", phoneNumber)
      .executeTakeFirst();

    return c.json({ available: !existingUser });
  } catch (error) {
    console.error("Check phone error:", error);
    return c.json({ error: "Failed to check phone number" }, 500);
  }
});

export default app;
