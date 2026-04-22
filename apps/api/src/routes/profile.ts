import { Hono } from "hono";
import { getDatabase } from "@repo/shared/database";
import { auth } from "../auth";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  generateProfilePictureKey,
  uploadToR2,
  deleteOldProfilePictures,
  getFromR2,
  type R2Bucket,
} from "../lib/r2";
import { type AppVariables, requireUser } from "../middleware/security";
import { verifyPassword } from "../crypto/password";

// Phone number validation (international format)
const phoneRegex = /^\+[1-9]\d{6,14}$/;

const updateProfileSchema = z.object({
  username: z.string().optional().nullable(),
  displayUsername: z.string().optional().nullable(),
  nationality: z
    .string()
    .regex(/^[A-Z]{2}$/, "Invalid country code")
    .optional()
    .nullable(),
  phoneNumber: z
    .string()
    .regex(phoneRegex, "Invalid phone number format")
    .optional()
    .nullable(),
  email: z
    .string()
    .email("Invalid email format")
    .optional()
    .nullable(),
  name: z.string().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

// Type for Cloudflare Workers environment bindings
type Bindings = {
  PROFILE_PICTURES?: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Upload profile picture to R2
app.post("/upload-picture", async (c) => {
  const userId = requireUser(c).id;
  const body = await c.req.parseBody();
  const file = body.file as File;

  if (!file) {
    return c.json({ error: "Missing file" }, 400);
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return c.json(
      { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
      400
    );
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return c.json({ error: "File too large. Maximum size is 5MB." }, 400);
  }

  try {
    const bucket = c.env?.PROFILE_PICTURES;

    if (!bucket) {
      // Fallback: store the image URL directly if R2 is not configured
      console.warn("R2 bucket not configured, using fallback storage");

      const db = getDatabase();
      await db
        .updateTable("user")
        .set({ profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(userId)}&size=200` })
        .where("id", "=", userId)
        .execute();

      return c.json({
        url: `https://ui-avatars.com/api/?name=${encodeURIComponent(userId)}&size=200`,
        warning: "R2 not configured, using placeholder",
      });
    }

    // Generate unique key for the file
    const key = generateProfilePictureKey(userId, file.type);

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await uploadToR2(bucket, key, arrayBuffer, file.type);

    // Clean up old profile pictures (keep only the latest)
    await deleteOldProfilePictures(bucket, userId, 1);

    // Build the URL - using our API endpoint to serve the file
    const baseUrl = c.req.url.split("/api/")[0];
    const pictureUrl = `${baseUrl}/api/profile/picture/${encodeURIComponent(key)}`;

    // Update user profile picture in database
    const db = getDatabase();
    await db
      .updateTable("user")
      .set({ profilePicture: pictureUrl })
      .where("id", "=", userId)
      .execute();

    return c.json({ url: pictureUrl });
  } catch (error) {
    console.error("Profile picture upload error:", error);
    return c.json({ error: "Failed to upload profile picture" }, 500);
  }
});

// Serve profile picture from R2
app.get("/picture/:key{.+}", async (c) => {
  const key = decodeURIComponent(c.req.param("key"));
  const bucket = c.env?.PROFILE_PICTURES;

  if (!bucket) {
    return c.json({ error: "Storage not configured" }, 500);
  }

  try {
    const object = await getFromR2(bucket, key);

    if (!object) {
      return c.json({ error: "Image not found" }, 404);
    }

    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
        ETag: object.etag,
      },
    });
  } catch (error) {
    console.error("Error serving profile picture:", error);
    return c.json({ error: "Failed to retrieve image" }, 500);
  }
});

// Update profile (username, nationality, phone, email, name)
app.post(
  "/update-profile",
  zValidator("json", updateProfileSchema),
  async (c) => {
    const data = c.req.valid("json");
    const userId = requireUser(c).id;
    const { username, displayUsername, nationality, phoneNumber, email, name } =
      data;

    // Validate username format if provided
    if (username) {
      if (username.length < 3 || username.length > 20) {
        return c.json(
          { error: "Username must be between 3 and 20 characters" },
          400
        );
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return c.json(
          {
            error:
              "Username can only contain letters, numbers, and underscores",
          },
          400
        );
      }
    }

    try {
      const db = getDatabase();

      // Check if username is already taken (if provided)
      if (username) {
        const existing = await db
          .selectFrom("user")
          .select("id")
          .where("username", "=", username)
          .where("id", "!=", userId)
          .executeTakeFirst();

        if (existing) {
          return c.json({ error: "Username is already taken" }, 400);
        }
      }

      // Check if phone number is already taken (if provided)
      if (phoneNumber) {
        const existingPhone = await db
          .selectFrom("user")
          .select("id")
          .where("phoneNumber", "=", phoneNumber)
          .where("id", "!=", userId)
          .executeTakeFirst();

        if (existingPhone) {
          return c.json({ error: "Phone number is already registered" }, 400);
        }
      }

      // Check if email is already taken (if provided)
      if (email) {
        const existingEmail = await db
          .selectFrom("user")
          .select("id")
          .where("email", "=", email)
          .where("id", "!=", userId)
          .executeTakeFirst();

        if (existingEmail) {
          return c.json({ error: "Email is already registered" }, 400);
        }
      }

      // Update user
      const updateData: Record<string, string | null> = {};
      if (username !== undefined) updateData.username = username || null;
      if (displayUsername !== undefined)
        updateData.displayUsername = displayUsername || null;
      if (nationality !== undefined)
        updateData.nationality = nationality || null;
      if (phoneNumber !== undefined)
        updateData.phoneNumber = phoneNumber || null;
      if (email !== undefined) updateData.email = email || null;
      if (name !== undefined) updateData.name = name || null;

      if (Object.keys(updateData).length > 0) {
        await db
          .updateTable("user")
          .set(updateData)
          .where("id", "=", userId)
          .execute();
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("Update profile error:", error);
      return c.json({ error: "Failed to update profile" }, 500);
    }
  }
);

// Legacy endpoint - keep for backwards compatibility
app.post("/update-username", async (c) => {
  const userId = requireUser(c).id;
  const { username, displayUsername, nationality } = await c.req.json();

  // Validate username format if provided
  if (username) {
    if (username.length < 3 || username.length > 20) {
      return c.json(
        { error: "Username must be between 3 and 20 characters" },
        400
      );
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return c.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        400
      );
    }
  }

  // Validate nationality format if provided (ISO 3166-1 alpha-2)
  if (nationality && nationality !== null) {
    if (!/^[A-Z]{2}$/.test(nationality)) {
      return c.json(
        { error: "Nationality must be a valid 2-letter ISO country code" },
        400
      );
    }
  }

  try {
    const db = getDatabase();

    // Check if username is already taken (if provided)
    if (username) {
      const existing = await db
        .selectFrom("user")
        .select("id")
        .where("username", "=", username)
        .where("id", "!=", userId)
        .executeTakeFirst();

      if (existing) {
        return c.json({ error: "Username is already taken" }, 400);
      }
    }

    // Update user
    const updateData: Record<string, string | null> = {};
    if (username !== undefined) updateData.username = username || null;
    if (displayUsername !== undefined)
      updateData.displayUsername = displayUsername || null;
    if (nationality !== undefined) updateData.nationality = nationality || null;

    if (Object.keys(updateData).length > 0) {
      await db
        .updateTable("user")
        .set(updateData)
        .where("id", "=", userId)
        .execute();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Update username error:", error);
    return c.json({ error: "Failed to update username" }, 500);
  }
});

// Change password — requires auth.api for BetterAuth's password change flow
app.post(
  "/change-password",
  zValidator("json", changePasswordSchema),
  async (c) => {
    const { currentPassword, newPassword } = c.req.valid("json");
    const userId = requireUser(c).id;

    try {
      // Check if user has a credential account (password-based)
      const db = getDatabase();
      const credentialAccount = await db
        .selectFrom("account")
        .select("id")
        .where("userId", "=", userId)
        .where("providerId", "=", "credential")
        .executeTakeFirst();

      if (!credentialAccount) {
        return c.json({
          error: "No password set. You signed up with Google. Use 'Set Password' to create one."
        }, 400);
      }

      // BetterAuth's changePassword needs raw headers for session validation
      const result = await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
        },
        headers: c.req.raw.headers,
      });

      if (!result) {
        return c.json({ error: "Failed to change password" }, 500);
      }

      return c.json({ success: true });
    } catch (error: any) {
      console.error("Change password error:", error);
      const errorMessage = error?.message || error?.body?.message || String(error);
      console.error("Error details:", errorMessage);

      // Handle specific error messages from better-auth
      if (errorMessage.includes("Invalid password") ||
          errorMessage.includes("incorrect") ||
          errorMessage.includes("Incorrect password")) {
        return c.json({ error: "Current password is incorrect" }, 400);
      }
      if (errorMessage.includes("doesn't have a password")) {
        return c.json({ error: "No password set for this account" }, 400);
      }
      return c.json({ error: "Failed to change password" }, 500);
    }
  }
);

const setPasswordSchema = z.object({
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

// Set password (for authenticated users - no current password required)
app.post(
  "/set-password",
  zValidator("json", setPasswordSchema),
  async (c) => {
    const { newPassword } = c.req.valid("json");
    const userId = requireUser(c).id;

    try {
      // Check if user already has a credential account (password-based)
      const db = getDatabase();
      const credentialAccount = await db
        .selectFrom("account")
        .select("id")
        .where("userId", "=", userId)
        .where("providerId", "=", "credential")
        .executeTakeFirst();

      if (credentialAccount) {
        return c.json({
          error: "You already have a password set. Please use the Change Password feature with your current password.",
          hasExistingPassword: true
        }, 400);
      }

      // BetterAuth's setPassword needs raw headers for session validation
      const result = await auth.api.setPassword({
        body: {
          newPassword,
        },
        headers: c.req.raw.headers,
      });

      if (!result) {
        return c.json({ error: "Failed to set password" }, 500);
      }

      return c.json({ success: true });
    } catch (error: any) {
      console.error("Set password error:", error);
      const errorMessage = error?.message || error?.body?.message || String(error);
      console.error("Set password error details:", errorMessage);

      // Handle specific error cases
      if (errorMessage.includes("already has a password") ||
          errorMessage.includes("credential already exists")) {
        return c.json({
          error: "You already have a password set",
          hasExistingPassword: true
        }, 400);
      }

      return c.json({ error: "Failed to set password" }, 500);
    }
  }
);

// Delete account — permanently removes user and all associated data
const deleteAccountSchema = z.object({
  confirmText: z.string(),
  password: z.string().optional(),
});

app.post(
  "/delete-account",
  zValidator("json", deleteAccountSchema),
  async (c) => {
    const { confirmText, password } = c.req.valid("json");
    const user = requireUser(c);
    const userId = user.id;

    // Validate confirmation text (accept both "DELETE" and "ELIMINAR")
    const validConfirmTexts = ["DELETE", "ELIMINAR"];
    if (!validConfirmTexts.includes(confirmText.trim().toUpperCase())) {
      return c.json({ error: "Invalid confirmation text" }, 400);
    }

    try {
      const db = getDatabase();

      // Check if user has a credential account (password-based)
      const credentialAccount = await db
        .selectFrom("account")
        .select(["id", "password"])
        .where("userId", "=", userId)
        .where("providerId", "=", "credential")
        .executeTakeFirst();

      // If user has a password, require it for deletion
      if (credentialAccount) {
        if (!password) {
          return c.json({ error: "Password is required to delete your account", requiresPassword: true }, 400);
        }
        const storedHash = credentialAccount.password;
        if (storedHash) {
          const isValid = await verifyPassword({ password, hash: storedHash });
          if (!isValid) {
            return c.json({ error: "Incorrect password" }, 400);
          }
        }
      }

      // Clean up non-cascading user data (independent operations run in parallel)
      await Promise.all([
        db.deleteFrom("push_tokens").where("user_id", "=", userId).execute(),
        db.deleteFrom("match_player_stats").where("user_id", "=", userId).execute(),
        db.deleteFrom("match_votes").where("voter_user_id", "=", userId).execute(),
        db.deleteFrom("match_votes").where("voted_for_user_id", "=", userId).execute(),
        db.updateTable("signups").set({ user_id: null }).where("user_id", "=", userId).execute(),
        db.deleteFrom("match_invitations").where("invited_by_user_id", "=", userId).execute(),
      ]);

      // Clean up R2 profile pictures
      try {
        const bucket = c.env?.PROFILE_PICTURES;
        if (bucket) {
          await deleteOldProfilePictures(bucket, userId, 0);
        }
      } catch (e) {
        console.error("Failed to clean up profile pictures:", e);
      }

      // Delete user row — account and session tables CASCADE automatically
      await db.deleteFrom("user").where("id", "=", userId).execute();

      return c.json({ success: true });
    } catch (error) {
      console.error("Delete account error:", error);
      return c.json({ error: "Failed to delete account" }, 500);
    }
  }
);

// Get user profile
app.get("/:userId", async (c) => {
  const userId = c.req.param("userId");

  try {
    const db = getDatabase();
    const user = await db
      .selectFrom("user")
      .select([
        "id",
        "name",
        "email",
        "image",
        "username",
        "displayUsername",
        "profilePicture",
        "nationality",
        "phoneNumber",
        "phoneNumberVerified",
      ])
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Strip sensitive fields unless requester is the owner or admin
    const requestingUser = requireUser(c);
    const isOwnerOrAdmin = requestingUser.id === userId || requestingUser.role === "superadmin";
    if (!isOwnerOrAdmin) {
      const { phoneNumber: _, email: __, ...safeUser } = user;
      return c.json(safeUser);
    }

    return c.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    return c.json({ error: "Failed to get profile" }, 500);
  }
});

export default app;
