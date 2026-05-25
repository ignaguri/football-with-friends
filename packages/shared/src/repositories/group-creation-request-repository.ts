// Turso/LibSQL data access for self-serve group-creation requests.
// Not group-scoped: a request exists before any group does.

import { nanoid } from "nanoid";

import { getDatabase } from "../database/connection";
import type { GroupCreationRequest, GroupRequestStatus } from "../domain/types";

function generateId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}

function rowToRequest(row: any): GroupCreationRequest {
  return {
    id: row.id,
    requestedByUserId: row.requested_by_user_id,
    name: row.name,
    reason: row.reason,
    status: row.status as GroupRequestStatus,
    decisionReason: row.decision_reason ?? undefined,
    decidedByUserId: row.decided_by_user_id ?? undefined,
    decidedAt: row.decided_at ? new Date(row.decided_at) : undefined,
    createdGroupId: row.created_group_id ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export interface CreateGroupRequestData {
  requestedByUserId: string;
  name: string;
  reason: string;
}

export interface MarkDecidedData {
  status: Extract<GroupRequestStatus, "approved" | "rejected">;
  decidedByUserId: string;
  decisionReason?: string;
  createdGroupId?: string;
}

export class TursoGroupCreationRequestRepository {
  private get db() {
    return getDatabase();
  }

  async create(data: CreateGroupRequestData): Promise<GroupCreationRequest> {
    const id = generateId("gcr");
    const row = await this.db
      .insertInto("group_creation_requests")
      .values({
        id,
        requested_by_user_id: data.requestedByUserId,
        name: data.name,
        reason: data.reason,
        status: "pending",
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToRequest(row);
  }

  async findById(id: string): Promise<GroupCreationRequest | null> {
    const row = await this.db
      .selectFrom("group_creation_requests")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? rowToRequest(row) : null;
  }

  async findPendingByUser(userId: string): Promise<GroupCreationRequest | null> {
    const row = await this.db
      .selectFrom("group_creation_requests")
      .selectAll()
      .where("requested_by_user_id", "=", userId)
      .where("status", "=", "pending")
      .executeTakeFirst();
    return row ? rowToRequest(row) : null;
  }

  async listByUser(userId: string): Promise<GroupCreationRequest[]> {
    const rows = await this.db
      .selectFrom("group_creation_requests")
      .selectAll()
      .where("requested_by_user_id", "=", userId)
      .orderBy("created_at", "desc")
      .execute();
    return rows.map(rowToRequest);
  }

  async listByStatus(status: GroupRequestStatus): Promise<GroupCreationRequest[]> {
    const rows = await this.db
      .selectFrom("group_creation_requests")
      .selectAll()
      .where("status", "=", status)
      .orderBy("created_at", "asc")
      .execute();
    return rows.map(rowToRequest);
  }

  async markDecided(id: string, data: MarkDecidedData): Promise<GroupCreationRequest> {
    const row = await this.db
      .updateTable("group_creation_requests")
      .set({
        status: data.status,
        decision_reason: data.decisionReason ?? null,
        decided_by_user_id: data.decidedByUserId,
        decided_at: new Date().toISOString(),
        created_group_id: data.createdGroupId ?? null,
        updated_at: new Date().toISOString(),
      })
      .where("id", "=", id)
      .where("status", "=", "pending")
      .returningAll()
      .executeTakeFirstOrThrow();
    return rowToRequest(row);
  }

  /** Deletes the caller's own pending request. Returns true if a row was removed. */
  async deletePending(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom("group_creation_requests")
      .where("id", "=", id)
      .where("requested_by_user_id", "=", userId)
      .where("status", "=", "pending")
      .executeTakeFirst();
    return Number(result.numDeletedRows ?? 0) > 0;
  }
}
