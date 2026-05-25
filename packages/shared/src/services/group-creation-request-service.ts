// Lifecycle for self-serve group creation requests. Owns the invariants that
// span tables (one pending per user; approve → create group + stamp request)
// and delegates actual group creation to GroupService.

import type { Group, GroupCreationRequest } from "../domain/types";
import type { TursoGroupCreationRequestRepository } from "../repositories/group-creation-request-repository";
import type { GroupService } from "./group-service";

function logEvent(event: string, payload: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ...payload, ts: new Date().toISOString() }));
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

export type SubmitOutcome =
  | { ok: true; request: GroupCreationRequest }
  | { ok: false; reason: "already_pending" };

export class GroupCreationRequestService {
  constructor(
    private requestRepo: TursoGroupCreationRequestRepository,
    private groupService: GroupService,
  ) {}

  async submit(params: { userId: string; name: string; reason: string }): Promise<SubmitOutcome> {
    const existing = await this.requestRepo.findPendingByUser(params.userId);
    if (existing) return { ok: false, reason: "already_pending" };
    try {
      const request = await this.requestRepo.create({
        requestedByUserId: params.userId,
        name: params.name,
        reason: params.reason,
      });
      logEvent("group_request.submitted", { requestId: request.id, userId: params.userId });
      return { ok: true, request };
    } catch (error) {
      // Lost a race against idx_gcr_one_pending_per_user (concurrent submit):
      // the pre-check above passed for both callers but the index rejected the
      // second insert. Surface it as the same clean "already pending" outcome.
      if (isUniqueViolation(error)) return { ok: false, reason: "already_pending" };
      throw error;
    }
  }

  async listForUser(userId: string): Promise<GroupCreationRequest[]> {
    return this.requestRepo.listByUser(userId);
  }

  async listPending(): Promise<GroupCreationRequest[]> {
    return this.requestRepo.listByStatus("pending");
  }

  async approve(
    requestId: string,
    adminUserId: string,
  ): Promise<{ group: Group; request: GroupCreationRequest }> {
    const request = await this.requestRepo.findById(requestId);
    if (!request || request.status !== "pending") {
      throw new Error("Request is not pending");
    }
    // Claim the request atomically BEFORE creating the group. markDecided's
    // `WHERE status = 'pending'` guard means a concurrent double-approve loses
    // here (throws) without ever reaching createGroup, so exactly one group is
    // created. The only window left — request 'approved' but created_group_id
    // still null — opens only if createGroup itself fails (infra), which is far
    // rarer and less harmful than a duplicate, member-bearing orphan group.
    await this.requestRepo.markDecided(requestId, {
      status: "approved",
      decidedByUserId: adminUserId,
    });
    // Requester becomes owner + organizer; visibility defaults to 'private'.
    const group = await this.groupService.createGroup({
      ownerUserId: request.requestedByUserId,
      name: request.name,
    });
    const decided = await this.requestRepo.setCreatedGroup(requestId, group.id);
    logEvent("group_request.approved", { requestId, groupId: group.id, adminUserId });
    return { group, request: decided };
  }

  async reject(
    requestId: string,
    adminUserId: string,
    reason: string,
  ): Promise<GroupCreationRequest> {
    if (!reason.trim()) throw new Error("A rejection reason is required");
    const request = await this.requestRepo.findById(requestId);
    if (!request || request.status !== "pending") {
      throw new Error("Request is not pending");
    }
    const decided = await this.requestRepo.markDecided(requestId, {
      status: "rejected",
      decidedByUserId: adminUserId,
      decisionReason: reason.trim(),
    });
    logEvent("group_request.rejected", { requestId, adminUserId, reason: reason.trim() });
    return decided;
  }

  async cancel(requestId: string, userId: string): Promise<boolean> {
    return this.requestRepo.deletePending(requestId, userId);
  }
}
