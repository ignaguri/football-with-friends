// Search public groups + request-to-join lifecycle. Approval adds membership
// (reusing the membership repo). Authorization is enforced at the route layer.

import type { Group, GroupJoinRequest } from "../domain/types";
import { scoreGroupMatch } from "../utils/group-search";
import type {
  TursoGroupRepository,
  TursoGroupMembershipRepository,
} from "../repositories/group-repositories";
import type { TursoGroupJoinRequestRepository } from "../repositories/group-join-request-repository";

const SCORE_THRESHOLD = 0.4;
const MAX_RESULTS = 20;

export type GroupSearchRelationship = "member" | "pending" | "none";

export interface GroupSearchResult {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  relationship: GroupSearchRelationship;
}

export type SubmitJoinOutcome =
  | { ok: true; request: GroupJoinRequest }
  | { ok: false; reason: "not_public" | "already_member" | "already_pending" };

function logEvent(event: string, payload: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ...payload, ts: new Date().toISOString() }));
}

export class GroupJoinRequestService {
  constructor(
    private groupRepo: TursoGroupRepository,
    private memberRepo: TursoGroupMembershipRepository,
    private requestRepo: TursoGroupJoinRequestRepository,
  ) {}

  async searchGroups(query: string, userId: string): Promise<GroupSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const candidates = await this.groupRepo.listPublic();
    const ranked = candidates
      .map((g) => ({ g, score: scoreGroupMatch(trimmed, g.name) }))
      .filter((x) => x.score >= SCORE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map((x) => x.g);

    if (ranked.length === 0) return [];

    const [myGroups, myRequests, counts] = await Promise.all([
      this.groupRepo.listByUserId(userId),
      this.requestRepo.listByUser(userId),
      this.memberRepo.countByGroupIds(ranked.map((g) => g.id)),
    ]);
    const memberOf = new Set(myGroups.map((g) => g.id));
    const pendingOf = new Set(
      myRequests.filter((r) => r.status === "pending").map((r) => r.groupId),
    );

    return ranked.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      memberCount: counts[g.id] ?? 0,
      relationship: memberOf.has(g.id) ? "member" : pendingOf.has(g.id) ? "pending" : "none",
    }));
  }

  async submitJoinRequest(params: {
    groupId: string;
    userId: string;
    message?: string;
  }): Promise<SubmitJoinOutcome> {
    const group = await this.groupRepo.findById(params.groupId);
    if (!group || group.visibility !== "public") return { ok: false, reason: "not_public" };

    const membership = await this.memberRepo.find(params.groupId, params.userId);
    if (membership) return { ok: false, reason: "already_member" };

    const pending = await this.requestRepo.findPendingByUserAndGroup(params.userId, params.groupId);
    if (pending) return { ok: false, reason: "already_pending" };

    const request = await this.requestRepo.create({
      groupId: params.groupId,
      requestedByUserId: params.userId,
      message: params.message,
    });
    logEvent("join_request.submitted", { requestId: request.id, groupId: params.groupId });
    return { ok: true, request };
  }

  async listForUser(userId: string): Promise<GroupJoinRequest[]> {
    return this.requestRepo.listByUser(userId);
  }

  async listPendingForGroup(groupId: string): Promise<GroupJoinRequest[]> {
    return this.requestRepo.listPendingByGroup(groupId);
  }

  async approve(
    requestId: string,
    groupId: string,
    deciderUserId: string,
  ): Promise<{ request: GroupJoinRequest; group: Group }> {
    const request = await this.requestRepo.findById(requestId);
    if (!request || request.groupId !== groupId || request.status !== "pending") {
      throw new Error("Join request is not pending");
    }
    const group = await this.groupRepo.findById(groupId);
    if (!group) throw new Error("Group not found");

    // Idempotent: tryAdd returns false if already a member.
    await this.memberRepo.tryAdd({
      groupId,
      userId: request.requestedByUserId,
      role: "member",
    });
    const decided = await this.requestRepo.markDecided(requestId, {
      status: "approved",
      decidedByUserId: deciderUserId,
    });
    logEvent("join_request.approved", { requestId, groupId, deciderUserId });
    return { request: decided, group };
  }

  async reject(
    requestId: string,
    groupId: string,
    deciderUserId: string,
    reason: string,
  ): Promise<GroupJoinRequest> {
    if (!reason.trim()) throw new Error("A rejection reason is required");
    const request = await this.requestRepo.findById(requestId);
    if (!request || request.groupId !== groupId || request.status !== "pending") {
      throw new Error("Join request is not pending");
    }
    const decided = await this.requestRepo.markDecided(requestId, {
      status: "rejected",
      decidedByUserId: deciderUserId,
      decisionReason: reason.trim(),
    });
    logEvent("join_request.rejected", { requestId, groupId, deciderUserId, reason: reason.trim() });
    return decided;
  }

  async cancel(requestId: string, userId: string): Promise<boolean> {
    return this.requestRepo.deletePending(requestId, userId);
  }
}
