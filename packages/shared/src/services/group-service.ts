// Business logic for the group-oriented multi-tenancy layer.
// All role/authorization gates live at the route boundary; this service
// owns invariants that span multiple tables (owner ≡ organizer member,
// leave-forbidden-for-owner, etc.) and transactional sequencing.

import type {
  Group,
  GroupMember,
  MemberRole,
  UpdateGroupData,
} from "../domain/types";
import type {
  TursoGroupMembershipRepository,
  TursoGroupRepository,
  TursoGroupSettingsRepository,
} from "../repositories/group-repositories";

export interface GroupDetails extends Group {
  members: GroupMember[];
  settings: Record<string, string>;
}

export class GroupService {
  constructor(
    private groupRepo: TursoGroupRepository,
    private memberRepo: TursoGroupMembershipRepository,
    private settingsRepo: TursoGroupSettingsRepository,
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
}
