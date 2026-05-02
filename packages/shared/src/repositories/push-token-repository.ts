// Turso/LibSQL implementation of push token repository using Kysely

import { sql } from "kysely";
import { nanoid } from "nanoid";

import type { PushTokenRepository } from "./interfaces";
import type { NotificationCategory, PushTokenInfo, RegisterPushTokenData } from "../domain/types";
import { CATEGORY_TO_COLUMN } from "../domain/types";

import { getDatabase } from "../database/connection";

function generateId(): string {
  return nanoid();
}

function dbRowToPushToken(row: any): PushTokenInfo {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    platform: row.platform,
    deviceId: row.device_id || undefined,
    active: Boolean(row.active),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class TursoPushTokenRepository implements PushTokenRepository {
  private get db() {
    return getDatabase();
  }

  async upsert(data: RegisterPushTokenData): Promise<PushTokenInfo> {
    const now = new Date().toISOString();
    const id = generateId();

    // Insert or update: if token already exists, reassign to the new user
    await sql`
      INSERT INTO push_tokens (id, user_id, token, platform, device_id, active, created_at, updated_at)
      VALUES (${id}, ${data.userId}, ${data.token}, ${data.platform}, ${data.deviceId ?? null}, 1, ${now}, ${now})
      ON CONFLICT(token) DO UPDATE SET
        user_id = ${data.userId},
        platform = ${data.platform},
        device_id = ${data.deviceId ?? null},
        active = 1,
        updated_at = ${now}
    `.execute(this.db);

    // Fetch the upserted row
    const result = await this.db
      .selectFrom("push_tokens")
      .selectAll()
      .where("token", "=", data.token)
      .executeTakeFirstOrThrow();

    return dbRowToPushToken(result);
  }

  async findActiveByUserId(
    userId: string,
    category?: NotificationCategory,
  ): Promise<PushTokenInfo[]> {
    const results = await this.applyPrefFilters(
      this.db
        .selectFrom("push_tokens")
        .leftJoin(
          "user_notification_prefs",
          "user_notification_prefs.user_id",
          "push_tokens.user_id",
        )
        .selectAll("push_tokens")
        .where("push_tokens.user_id", "=", userId)
        .where("push_tokens.active", "=", 1),
      category,
    ).execute();

    return results.map(dbRowToPushToken);
  }

  async findActiveByUserIds(
    userIds: string[],
    category?: NotificationCategory,
  ): Promise<PushTokenInfo[]> {
    if (userIds.length === 0) return [];

    // Chunk to stay within SQLite parameter limits; each chunk is independent.
    const chunkSize = 500;
    const chunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += chunkSize) {
      chunks.push(userIds.slice(i, i + chunkSize));
    }

    const chunkResults = await Promise.all(
      chunks.map((chunk) =>
        this.applyPrefFilters(
          this.db
            .selectFrom("push_tokens")
            .leftJoin(
              "user_notification_prefs",
              "user_notification_prefs.user_id",
              "push_tokens.user_id",
            )
            .selectAll("push_tokens")
            .where("push_tokens.user_id", "in", chunk)
            .where("push_tokens.active", "=", 1),
          category,
        ).execute(),
      ),
    );

    return chunkResults.flat().map(dbRowToPushToken);
  }

  // Applies master push_enabled + per-category filters, defaulting to "on"
  // when the joined prefs row is missing (COALESCE-based opt-out semantics).
  private applyPrefFilters<T>(query: T, category?: NotificationCategory): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = query as any;
    q = q.where(sql`COALESCE(user_notification_prefs.push_enabled, 1)`, "=", 1);
    if (category) {
      const column = CATEGORY_TO_COLUMN[category];
      q = q.where(sql.raw(`COALESCE(user_notification_prefs.${column}, 1)`), "=", 1);
    }
    return q as T;
  }

  async deactivateToken(token: string): Promise<void> {
    await this.db
      .updateTable("push_tokens")
      .set({ updated_at: new Date().toISOString(), active: 0 })
      .where("token", "=", token)
      .execute();
  }

  async deactivateTokenForUser(token: string, userId: string): Promise<void> {
    const result = await this.db
      .updateTable("push_tokens")
      .set({ updated_at: new Date().toISOString(), active: 0 })
      .where("token", "=", token)
      .where("user_id", "=", userId)
      .execute();

    if (Number(result[0]?.numUpdatedRows ?? 0) === 0) {
      throw new Error("Token not found or does not belong to this user");
    }
  }

  async deactivateByUserId(userId: string): Promise<void> {
    await this.db
      .updateTable("push_tokens")
      .set({ updated_at: new Date().toISOString(), active: 0 })
      .where("user_id", "=", userId)
      .execute();
  }

  async deleteByToken(token: string): Promise<void> {
    await this.db.deleteFrom("push_tokens").where("token", "=", token).execute();
  }
}
