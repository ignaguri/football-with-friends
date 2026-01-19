import { Hono } from "hono";
import { put } from "@vercel/blob";
import { getDatabase } from "@repo/shared/database";

const app = new Hono();

// Upload profile picture
app.post("/upload-picture", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file as File;
  const userId = body.userId as string;

  if (!file || !userId) {
    return c.json({ error: "Missing file or userId" }, 400);
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
    // Upload to Vercel Blob
    const blob = await put(`profile-pictures/${userId}-${Date.now()}`, file, {
      access: "public",
      contentType: file.type,
    });

    // Update user profile picture in database
    const db = getDatabase();
    await db
      .updateTable("user")
      .set({ profilePicture: blob.url })
      .where("id", "=", userId)
      .execute();

    return c.json({ url: blob.url });
  } catch (error) {
    console.error("Profile picture upload error:", error);
    return c.json({ error: "Failed to upload profile picture" }, 500);
  }
});

// Update username
app.post("/update-username", async (c) => {
  const { userId, username, displayUsername, nationality } = await c.req.json();

  if (!userId) {
    return c.json({ error: "Missing userId" }, 400);
  }

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
      ])
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    return c.json({ error: "Failed to get profile" }, 500);
  }
});

export default app;
