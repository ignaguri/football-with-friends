// Business logic for the group-oriented multi-tenancy layer.
// All role/authorization gates live at the route boundary; this service
// owns invariants that span multiple tables (owner ≡ organizer member,
// leave-forbidden-for-owner, etc.) and transactional sequencing.

import type {
  Group,
  GroupInvite,
  GroupInviteInvalidReason,
  GroupInvitePreview,
  GroupMemberWithUser,
  GroupRoster,
  MemberRole,
  UpdateGroupData,
  UpdateGroupRosterData,
} from "../domain/types";
import { getDatabase } from "../database/connection";
import type {
  TursoGroupInviteRepository,
  TursoGroupMembershipRepository,
  TursoGroupRepository,
  TursoGroupRosterRepository,
  TursoGroupSettingsRepository,
} from "../repositories/group-repositories";
import type {
  LocationRepository,
  CourtRepository,
} from "../repositories/interfaces";

// Structured log line. Cloudflare Workers ingests `console.log` output and
// indexes on top-level JSON fields, so every event emits a single JSON line.
function logEvent(event: string, payload: Record<string, unknown>): void {
  console.log(
    JSON.stringify({ event, ...payload, ts: new Date().toISOString() }),
  );
}

export interface GroupDetails extends Group {
  members: GroupMemberWithUser[];
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

export interface RosterCreateParams {
  groupId: string;
  displayName: string;
  phone?: string;
  email?: string;
  createdByUserId: string;
}

export type RosterCreateErrorReason = "already_member";
export type RosterDeleteErrorReason = "referenced";

export type CreateRosterOutcome =
  | { created: true; entry: GroupRoster }
  | { created: false; reason: RosterCreateErrorReason; userId: string };

export type DeleteRosterOutcome =
  | { deleted: true }
  | {
      deleted: false;
      reason: RosterDeleteErrorReason;
      referencingSignupCount: number;
    };

export type RosterListEntry = Omit<
  GroupRoster,
  "claimedByUser" | "createdByUser"
> & {
  claimedByUser?: { id: string; name: string };
};

export interface CopyVenuesOutcome {
  locationsCopied: number;
  courtsCopied: number;
}

export class GroupService {
  constructor(
    private groupRepo: TursoGroupRepository,
    private memberRepo: TursoGroupMembershipRepository,
    private settingsRepo: TursoGroupSettingsRepository,
    private inviteRepo: TursoGroupInviteRepository,
    private rosterRepo: TursoGroupRosterRepository,
    private locationRepo: LocationRepository,
    private courtRepo: CourtRepository,
  ) {}

  async listMyGroups(userId: string) {
    return this.groupRepo.listByUserId(userId);
  }

  /**
   * Creates a new group and enrolls the caller as owner + organizer.
   * Turso/LibSQL lacks transactions across repos in this codebase, so we
   * insert the group first, then the membership; on failure the caller may
   * see an orphan group — acceptable at this scale (platform-admin-only today).
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
    logEvent("group.created", {
      groupId: group.id,
      ownerUserId: params.ownerUserId,
      name: group.name,
      slug: group.slug,
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
      this.memberRepo.listByGroupWithUsers(groupId),
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

  async listMembers(groupId: string): Promise<GroupMemberWithUser[]> {
    return this.memberRepo.listByGroupWithUsers(groupId);
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
    logEvent("group.ownership_transferred", {
      groupId,
      fromUserId,
      toUserId,
    });
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

    logEvent("invite.accepted", {
      groupId: invite.groupId,
      userId: params.userId,
      inviteId: invite.id,
      newMembership: addedNewMembership,
    });
    if (claimedRosterId) {
      logEvent("ghost.claimed", {
        groupId: invite.groupId,
        userId: params.userId,
        rosterId: claimedRosterId,
        inviteId: invite.id,
      });
    }

    return {
      joined: true,
      groupId: invite.groupId,
      claimedRosterId,
      ambiguousRosterMatches,
    };
  }

  // --- Roster (ghosts) ---------------------------------------------------

  /**
   * Organizer view of the group's roster. Hydrates `claimedByUser` with
   * id/name via a single batched lookup so the UI can render linked-member
   * badges without N+1 queries.
   */
  async listRoster(groupId: string): Promise<RosterListEntry[]> {
    const entries = await this.rosterRepo.listByGroup(groupId);
    const claimedIds = Array.from(
      new Set(
        entries.map((e) => e.claimedByUserId).filter((v): v is string => !!v),
      ),
    );
    if (claimedIds.length === 0) return entries;

    const users = await getDatabase()
      .selectFrom("user")
      .select(["id", "name"])
      .where("id", "in", claimedIds)
      .execute();
    const byId = new Map(users.map((u) => [u.id, { id: u.id, name: u.name ?? "" }]));
    return entries.map((e) => ({
      ...e,
      claimedByUser: e.claimedByUserId ? byId.get(e.claimedByUserId) : undefined,
    }));
  }

  /**
   * Creates a ghost after rejecting phone/email collisions with an existing
   * member. This protects against the common mistake of "add a guest to the
   * roster" when the right action is "invite them as a member" — the service
   * surfaces the existing userId so the UI can link to an invite flow.
   */
  async createRosterEntry(params: RosterCreateParams): Promise<CreateRosterOutcome> {
    const collidingMemberId = await this.memberRepo.findMemberByContact(
      params.groupId,
      { phone: params.phone, email: params.email },
    );
    if (collidingMemberId) {
      return {
        created: false,
        reason: "already_member",
        userId: collidingMemberId,
      };
    }

    const entry = await this.rosterRepo.create({
      groupId: params.groupId,
      displayName: params.displayName,
      phone: params.phone,
      email: params.email,
      createdByUserId: params.createdByUserId,
    });
    return { created: true, entry };
  }

  /**
   * Partial update + cross-group guard. If the caller is setting
   * `claimedByUserId` to a non-null value we verify membership so we don't
   * silently attribute signups to a non-member.
   */
  async updateRosterEntry(
    rosterId: string,
    currentGroupId: string,
    patch: UpdateGroupRosterData,
  ): Promise<GroupRoster> {
    const existing = await this.rosterRepo.findById(rosterId);
    if (!existing || existing.groupId !== currentGroupId) {
      throw new Error("Roster entry not found");
    }
    if (patch.claimedByUserId) {
      const membership = await this.memberRepo.find(
        currentGroupId,
        patch.claimedByUserId,
      );
      if (!membership) {
        throw new Error("Target user is not a member of this group");
      }
    }
    return this.rosterRepo.update(rosterId, patch);
  }

  /**
   * Default-safe delete: refuses to drop a ghost that still appears in
   * signups, returning the reference count so the UI can offer a force
   * path. The force path nulls `signups.roster_id` rather than deleting
   * the signup — we'd rather lose the attribution link than the history.
   */
  async deleteRosterEntry(
    rosterId: string,
    currentGroupId: string,
    options: { force?: boolean } = {},
  ): Promise<DeleteRosterOutcome> {
    const existing = await this.rosterRepo.findById(rosterId);
    if (!existing || existing.groupId !== currentGroupId) {
      throw new Error("Roster entry not found");
    }

    const db = getDatabase();
    const countRow = await db
      .selectFrom("signups")
      .select((eb) => eb.fn.countAll().as("c"))
      .where("roster_id", "=", rosterId)
      .executeTakeFirst();
    const referencingSignupCount = Number(countRow?.c ?? 0);

    if (referencingSignupCount > 0 && !options.force) {
      return { deleted: false, reason: "referenced", referencingSignupCount };
    }

    if (referencingSignupCount > 0) {
      await db
        .updateTable("signups")
        .set({ roster_id: null })
        .where("roster_id", "=", rosterId)
        .execute();
    }
    await this.rosterRepo.delete(rosterId);
    return { deleted: true };
  }

  // --- Venues (cross-group) ---------------------------------------------

  /**
   * Duplicates all locations and courts from `sourceGroupId` into
   * `targetGroupId` with fresh ids. Auth (must be organizer/platform admin in
   * both groups) is enforced at the route boundary; this method trusts its
   * caller. Not transactional across repos — a partial copy may occur if a
   * write fails halfway; organizers can clean up manually. Acceptable at
   * current scale (setup-time tool, low frequency).
   */
  async copyVenues(
    sourceGroupId: string,
    targetGroupId: string,
  ): Promise<CopyVenuesOutcome> {
    if (sourceGroupId === targetGroupId) {
      throw new Error("Source and target group must differ");
    }

    const sourceGroup = await this.groupRepo.findById(sourceGroupId);
    if (!sourceGroup) {
      throw new Error("Source group not found");
    }

    const [sourceLocations, sourceCourts] = await Promise.all([
      this.locationRepo.findAll(sourceGroupId),
      this.courtRepo.findAll(sourceGroupId),
    ]);

    // Derive `courtCount` from the actual courts rather than copying the
    // source location's denormalized counter — source data may be stale, and
    // a partial write would otherwise leave the target's counter inconsistent
    // with its real court rows.
    const courtsByLocationId = new Map<string, number>();
    for (const court of sourceCourts) {
      courtsByLocationId.set(
        court.locationId,
        (courtsByLocationId.get(court.locationId) ?? 0) + 1,
      );
    }

    const createdLocations = await Promise.all(
      sourceLocations.map((loc) =>
        this.locationRepo.create({
          groupId: targetGroupId,
          name: loc.name,
          address: loc.address,
          coordinates: loc.coordinates,
          courtCount: courtsByLocationId.get(loc.id) ?? 0,
        }),
      ),
    );
    const locationIdMap = new Map<string, string>();
    sourceLocations.forEach((loc, i) => {
      const created = createdLocations[i];
      if (created) locationIdMap.set(loc.id, created.id);
    });

    const courtsToCreate = sourceCourts.flatMap((court) => {
      const newLocationId = locationIdMap.get(court.locationId);
      if (!newLocationId) return [];
      return [
        this.courtRepo.create({
          groupId: targetGroupId,
          locationId: newLocationId,
          name: court.name,
          description: court.description,
          isActive: court.isActive,
        }),
      ];
    });
    const createdCourts = await Promise.all(courtsToCreate);

    return {
      locationsCopied: locationIdMap.size,
      courtsCopied: createdCourts.length,
    };
  }
}
