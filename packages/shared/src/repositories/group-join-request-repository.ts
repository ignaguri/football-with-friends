// Turso/LibSQL data access for group join requests (request-to-join a public group).

import { nanoid } from "nanoid";

import { getDatabase } from "../database/connection";
import type { GroupJoinRequest, GroupJoinRequestStatus } from "../domain/types";

function rowToRequest(row: any): GroupJoinRequest {
  return {
    id: row.id,
    groupId: row.group_id,
    requestedByUserId: row.requested_by_user_id,
    message: row.message ?? undefined,
    status: row.status as GroupJoinRequestStatus,
    decisionReason: row.decision_reason ?? undefined,
    decidedByUserId: row.decided_by_user_id ?? undefined,
    decidedAt: row.decided_at ? new Date(row.decided_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export interface CreateJoinRequestData {
  groupId: string;
  requestedByUserId: string;
  message?: string;
}

export interface MarkJoinDecidedData {
  status: Extract<GroupJoinRequestStatus, "approved" | "rejected">;
  decidedByUserId: string;
  decisionReason?: string;
}

export class TursoGroupJoinRequestRepository {
  private get db() {
    return getDatabase();
  }

  async create(data: CreateJoinRequestData): Promise<GroupJoinRequest> {
    const id = `gjr_${nanoid()}`;
    const row = await this.db
      .insertInto("group_join_requests")
      .values({
        id,
        group_id: data.groupId,
        requested_by_user_id: data.requestedByUserId,
        message: data.message ?? null,
        status: "pending",
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToRequest(row);
  }

  async findById(id: string): Promise<GroupJoinRequest | null> {
    const row = await this.db
      .selectFrom("group_join_requests")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? rowToRequest(row) : null;
  }

  async findPendingByUserAndGroup(
    userId: string,
    groupId: string,
  ): Promise<GroupJoinRequest | null> {
    const row = await this.db
      .selectFrom("group_join_requests")
      .selectAll()
      .where("requested_by_user_id", "=", userId)
      .where("group_id", "=", groupId)
      .where("status", "=", "pending")
      .executeTakeFirst();
    return row ? rowToRequest(row) : null;
  }

  async listByUser(userId: string): Promise<GroupJoinRequest[]> {
    const rows = await this.db
      .selectFrom("group_join_requests")
      .selectAll()
      .where("requested_by_user_id", "=", userId)
      .orderBy("created_at", "desc")
      .execute();
    return rows.map(rowToRequest);
  }

  async listPendingByGroup(groupId: string): Promise<GroupJoinRequest[]> {
    const rows = await this.db
      .selectFrom("group_join_requests")
      .selectAll()
      .where("group_id", "=", groupId)
      .where("status", "=", "pending")
      .orderBy("created_at", "asc")
      .execute();
    return rows.map(rowToRequest);
  }

  async markDecided(id: string, data: MarkJoinDecidedData): Promise<GroupJoinRequest> {
    const row = await this.db
      .updateTable("group_join_requests")
      .set({
        status: data.status,
        decided_by_user_id: data.decidedByUserId,
        decision_reason: data.decisionReason ?? null,
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .where("status", "=", "pending")
      .returningAll()
      .executeTakeFirst();
    // No row means a concurrent decision already moved it out of 'pending'.
    // Surface the same domain error the service uses, so the route returns 400 not 500.
    if (!row) throw new Error("Join request is not pending");
    return rowToRequest(row);
  }

  async deletePending(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom("group_join_requests")
      .where("id", "=", id)
      .where("requested_by_user_id", "=", userId)
      .where("status", "=", "pending")
      .executeTakeFirst();
    return Number(result.numDeletedRows ?? 0) > 0;
  }
}
