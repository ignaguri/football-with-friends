// Turso/LibSQL implementation of push token repository using Kysely

import { sql } from "kysely";
import { nanoid } from "nanoid";

import type { PushTokenRepository } from "./interfaces";
import type { PushTokenInfo, RegisterPushTokenData } from "../domain/types";

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

  async findActiveByUserId(userId: string): Promise<PushTokenInfo[]> {
    const results = await this.db
      .selectFrom("push_tokens")
      .selectAll()
      .where("user_id", "=", userId)
      .where("active", "=", 1)
      .execute();

    return results.map(dbRowToPushToken);
  }

  async findActiveByUserIds(userIds: string[]): Promise<PushTokenInfo[]> {
    if (userIds.length === 0) return [];

    // Batch in chunks of 500 to stay within SQLite parameter limits
    const chunkSize = 500;
    const allResults: PushTokenInfo[] = [];

    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize);
      const results = await this.db
        .selectFrom("push_tokens")
        .selectAll()
        .where("user_id", "in", chunk)
        .where("active", "=", 1)
        .execute();

      allResults.push(...results.map(dbRowToPushToken));
    }

    return allResults;
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
    await this.db
      .deleteFrom("push_tokens")
      .where("token", "=", token)
      .execute();
  }
}
