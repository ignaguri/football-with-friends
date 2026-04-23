// Business logic for the group-oriented multi-tenancy layer.
// All role/authorization gates live at the route boundary; this service
// owns invariants that span multiple tables (owner ≡ organizer member,
// leave-forbidden-for-owner, etc.) and transactional sequencing.

import type {
  Group,
  GroupInvite,
  GroupInviteInvalidReason,
  GroupInvitePreview,
  GroupMember,
  MemberRole,
  UpdateGroupData,
} from "../domain/types";
import { getDatabase } from "../database/connection";
import type {
  TursoGroupInviteRepository,
  TursoGroupMembershipRepository,
  TursoGroupRepository,
  TursoGroupRosterRepository,
  TursoGroupSettingsRepository,
} from "../repositories/group-repositories";

export interface GroupDetails extends Group {
  members: GroupMember[];
  settings: Record<string, string>;
}

export interface InviteCreateParams {
  groupId: string;
  createdByUserId: string;
  expiresInHours?: number;
  maxUses?: number;
  targetPhone?: string;
  targetUserId?: string;
}

export type InviteAcceptOutcome =
  | {
      joined: true;
      groupId: string;
      claimedRosterId?: string;
      ambiguousRosterMatches?: number;
    }
  | {
      joined: false;
      reason: GroupInviteInvalidReason;
    };

export class GroupService {
  constructor(
    private groupRepo: TursoGroupRepository,
    private memberRepo: TursoGroupMembershipRepository,
    private settingsRepo: TursoGroupSettingsRepository,
    private inviteRepo: TursoGroupInviteRepository,
    private rosterRepo: TursoGroupRosterRepository,
  ) {}

  async listMyGroups(userId: string) {
    return this.groupRepo.listByUserId(userId);
  }

  /**
   * Creates a new group and enrolls the caller as owner + organizer.
   * Turso/LibSQL lacks transactions across repos in this codebase, so we
   * insert the group first, then the membership; on failure the caller may
   * see an orphan group — acceptable at this scale (superadmin-only today).
   */
  async createGroup(params: { ownerUserId: string; name: string; slug?: string }): Promise<Group> {
    const group = await this.groupRepo.create({
      name: params.name,
      slug: params.slug,
      ownerUserId: params.ownerUserId,
    });
    await this.memberRepo.add({
      groupId: group.id,
      userId: params.ownerUserId,
      role: "organizer",
    });
    return group;
  }

  /**
   * Organizer-only full view: group + members + settings. Members use
   * `findById` directly and skip the member/settings fetches — see the
   * route handler for the lighter payload shape.
   */
  async getGroupDetails(groupId: string): Promise<GroupDetails | null> {
    const group = await this.groupRepo.findById(groupId);
    if (!group) return null;
    const [members, settings] = await Promise.all([
      this.memberRepo.listByGroup(groupId),
      this.settingsRepo.getAll(groupId),
    ]);
    return { ...group, members, settings };
  }

  async getGroupBasics(groupId: string): Promise<Group | null> {
    return this.groupRepo.findById(groupId);
  }

  async updateGroup(groupId: string, updates: UpdateGroupData): Promise<Group> {
    const existing = await this.groupRepo.findById(groupId);
    if (!existing) throw new Error("Group not found");
    return this.groupRepo.update(groupId, updates);
  }

  async softDeleteGroup(groupId: string): Promise<void> {
    await this.groupRepo.softDelete(groupId);
  }

  async listMembers(groupId: string): Promise<GroupMember[]> {
    return this.memberRepo.listByGroup(groupId);
  }

  async updateMemberRole(
    groupId: string,
    userId: string,
    role: MemberRole,
  ): Promise<void> {
    const membership = await this.memberRepo.find(groupId, userId);
    if (!membership) throw new Error("Member not found");
    await this.memberRepo.updateRole(groupId, userId, role);
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    const group = await this.groupRepo.findById(groupId);
    if (!group) throw new Error("Group not found");
    if (group.ownerUserId === userId) {
      throw new Error("Cannot remove the owner; transfer ownership first");
    }
    await this.memberRepo.remove(groupId, userId);
  }

  /**
   * Self-leave. Owner must transfer ownership first — checked here because
   * the DB doesn't know the ownership relationship is membership-coupled.
   */
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.groupRepo.findById(groupId);
    if (!group) throw new Error("Group not found");
    if (group.ownerUserId === userId) {
      throw new Error("Owner cannot leave; transfer ownership first");
    }
    await this.memberRepo.remove(groupId, userId);
  }

  /**
   * Transfers ownership to an existing organizer. The target must already be
   * a member with organizer role — promoting + transferring in a single step
   * would hide intent and make audit trails harder to read.
   */
  async transferOwnership(
    groupId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<void> {
    const group = await this.groupRepo.findById(groupId);
    if (!group) throw new Error("Group not found");
    if (group.ownerUserId !== fromUserId) {
      throw new Error("Only the current owner can transfer ownership");
    }
    const targetMembership = await this.memberRepo.find(groupId, toUserId);
    if (!targetMembership || targetMembership.role !== "organizer") {
      throw new Error("Target must be an existing organizer of this group");
    }
    await this.groupRepo.transferOwnership(groupId, toUserId);
  }

  // --- Invites -----------------------------------------------------------

  async listInvites(groupId: string): Promise<GroupInvite[]> {
    return this.inviteRepo.listActiveByGroup(groupId);
  }

  async createInvite(params: InviteCreateParams): Promise<GroupInvite> {
    const expiresAt =
      typeof params.expiresInHours === "number" && params.expiresInHours > 0
        ? new Date(Date.now() + params.expiresInHours * 3600 * 1000)
        : undefined;
    return this.inviteRepo.create({
      groupId: params.groupId,
      createdByUserId: params.createdByUserId,
      expiresAt,
      maxUses: params.maxUses,
      targetPhone: params.targetPhone,
      targetUserId: params.targetUserId,
    });
  }

  async revokeInvite(groupId: string, inviteId: string): Promise<void> {
    const invite = await this.inviteRepo.findById(inviteId);
    if (!invite || invite.groupId !== groupId) {
      throw new Error("Invite not found");
    }
    await this.inviteRepo.revoke(inviteId);
  }

  /**
   * Unauthenticated preview for the `/join/:token` landing page. Returns a
   * minimal payload so we don't leak membership details to strangers — just
   * group name + inviter name + validity.
   */
  async getInvitePreview(token: string): Promise<GroupInvitePreview> {
    const invite = await this.inviteRepo.findByToken(token);
    if (!invite) return { valid: false, reason: "not_found" };
    if (invite.revokedAt) return { valid: false, reason: "revoked" };
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return { valid: false, reason: "expired" };
    }
    if (invite.maxUses !== undefined && invite.usesCount >= invite.maxUses) {
      return { valid: false, reason: "exhausted" };
    }

    // Group + inviter lookups are independent; kick them off together.
    const [group, inviterRow] = await Promise.all([
      this.groupRepo.findById(invite.groupId),
      getDatabase()
        .selectFrom("user")
        .select(["id", "name"])
        .where("id", "=", invite.createdByUserId)
        .executeTakeFirst(),
    ]);
    if (!group) return { valid: false, reason: "not_found" };

    return {
      valid: true,
      group: { id: group.id, name: group.name },
      inviter: inviterRow
        ? { id: inviterRow.id, name: inviterRow.name ?? "" }
        : undefined,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Consumes an invite for an authenticated user.
   *
   * Concurrency-safe: membership add is idempotent via UNIQUE(group_id,
   * user_id), `uses_count` is only bumped via an atomic conditional update
   * that refuses to cross `max_uses`, and roster claim is conditional on
   * `claimed_by_user_id IS NULL` so two racing accepters can't both "win"
   * the same ghost. Under extreme concurrency max_uses may admit one extra
   * joiner (counter is capped correctly but the member row is already in);
   * acceptable at small-tenancy scale, would need a row-lock or serializable
   * txn to close fully.
   */
  async acceptInvite(params: {
    token: string;
    userId: string;
  }): Promise<InviteAcceptOutcome> {
    const invite = await this.inviteRepo.findByToken(params.token);
    if (!invite) return { joined: false, reason: "not_found" };
    if (invite.revokedAt) return { joined: false, reason: "revoked" };
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return { joined: false, reason: "expired" };
    }
    if (invite.maxUses !== undefined && invite.usesCount >= invite.maxUses) {
      return { joined: false, reason: "exhausted" };
    }
    if (invite.targetUserId && invite.targetUserId !== params.userId) {
      return { joined: false, reason: "target_mismatch" };
    }

    // Reject accepts into a soft-deleted group — `findById` filters on
    // `deleted_at IS NULL`, so a null result here means the group is gone.
    const group = await this.groupRepo.findById(invite.groupId);
    if (!group) return { joined: false, reason: "not_found" };

    // Session doesn't carry phoneNumber, so fetch email + phone in a single
    // round-trip for targetPhone validation + roster auto-claim.
    const userRow = await getDatabase()
      .selectFrom("user")
      .select(["email", "phoneNumber"])
      .where("id", "=", params.userId)
      .executeTakeFirst();
    const userEmail = userRow?.email ?? undefined;
    const userPhone = userRow?.phoneNumber ?? undefined;

    if (
      invite.targetPhone &&
      (!userPhone || invite.targetPhone !== userPhone)
    ) {
      return { joined: false, reason: "target_mismatch" };
    }

    const addedNewMembership = await this.memberRepo.tryAdd({
      groupId: invite.groupId,
      userId: params.userId,
      role: "member",
    });
    if (addedNewMembership) {
      const consumed = await this.inviteRepo.tryConsumeUse(invite.id);
      if (!consumed && invite.maxUses !== undefined) {
        // Another accept raced us past max_uses after our optimistic check.
        // Member is already in; counter stays capped. Log-worthy but not
        // fatal at current scale.
      }
    }

    // Auto-claim roster ghost if exactly one unclaimed entry matches by
    // phone or email. Parallel lookups; dedupe via Set of ids. The final
    // write uses `tryClaim` so two racing accepts can't both steal the row.
    const [byPhone, byEmail] = await Promise.all([
      userPhone
        ? this.rosterRepo.findByGroupAndPhone(invite.groupId, userPhone)
        : Promise.resolve([]),
      userEmail
        ? this.rosterRepo.findByGroupAndEmail(invite.groupId, userEmail)
        : Promise.resolve([]),
    ]);
    const matchIds = new Set<string>();
    for (const r of byPhone) if (!r.claimedByUserId) matchIds.add(r.id);
    for (const r of byEmail) if (!r.claimedByUserId) matchIds.add(r.id);

    let claimedRosterId: string | undefined;
    let ambiguousRosterMatches: number | undefined;
    if (matchIds.size === 1) {
      const [only] = matchIds;
      if (only) {
        const claimed = await this.rosterRepo.tryClaim(only, params.userId);
        if (claimed) claimedRosterId = only;
      }
    } else if (matchIds.size > 1) {
      ambiguousRosterMatches = matchIds.size;
    }

    return {
      joined: true,
      groupId: invite.groupId,
      claimedRosterId,
      ambiguousRosterMatches,
    };
  }
}
